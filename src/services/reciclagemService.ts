import { normalizePhone } from './blocklistService';

export interface ReciclagemPreferences {
  selectedResultados: string[];
  selectedInteracoes: string[];
}

export interface CallRecord {
  dateTimeRaw: string;
  timestamp: number;
  resultado: string;
}

export interface InteractionRecord {
  dateTimeRaw: string;
  timestamp: number;
  descInteracao: string;
}

export interface ParsedResultadoChamadas {
  distinctResultados: string[];
  latestCallMap: Map<string, CallRecord>;
  totalRows: number;
  uniquePhonesCount: number;
}

export interface ParsedUltimaInteracao {
  distinctInteracoes: string[];
  latestInterMap: Map<string, InteractionRecord>;
  totalRows: number;
  uniquePhonesCount: number;
}

export interface ReciclagemResult {
  totalRows: number;
  keptRowsCount: number;
  removedRowsCount: number;
  removedByCallCount: number;
  removedByInterCount: number;
  removedByBothCount: number;
  outputFileName: string;
  csvContent: string;
  sampleRemoved: Array<{ phone: string; reason: string; rowSnippet: string }>;
}

const REFRESH_PREFS_KEY = 'demands_reciclagem_prefs';

// Standard unproductive defaults in case user hasn't saved preferences yet
export const DEFAULT_UNPRODUCTIVE_RESULTADOS = [
  'Muda',
  'Ocupado',
  'Abandonada',
  'Atendimento Eletronico',
  'Número Inválido',
  'Bloqueio - BlackList',
  'Não Atendido',
  'Falha',
  'Abandonado Cliente',
  'Negado pela operadora'
];

export const DEFAULT_UNPRODUCTIVE_INTERACOES = [
  'SEM INTERAÇÃO',
  'ANUNCIADORA',
  'NAO CONHECE',
  'NAO E O RESPONSAVEL',
  'POSSUI OUTRO BANCO',
  'TRANSFERIDO',
  'VAI PENSAR'
];

// Helper to normalize text values for matching (case insensitive, trim, accents)
export const normalizeString = (s: string): string => {
  if (!s) return '';
  return s
    .trim()
    .toUpperCase()
    .replace(/[ÁÀÃÂ]/g, 'A')
    .replace(/[ÉÈÊ]/g, 'E')
    .replace(/[ÍÌ]/g, 'I')
    .replace(/[ÓÒÕÔ]/g, 'O')
    .replace(/[ÚÙ]/g, 'U')
    .replace(/Ç/g, 'C');
};

// Convert 'DD/MM/YYYY HH:mm:ss' to a numeric timestamp for fast comparison
export const parseDateTimeToTimestamp = (dateStr: string): number => {
  if (!dateStr) return 0;
  const parts = dateStr.trim().split(' ');
  if (parts.length === 0) return 0;

  const dateParts = parts[0].split('/');
  if (dateParts.length < 3) return 0;

  const day = parseInt(dateParts[0], 10) || 1;
  const month = parseInt(dateParts[1], 10) || 1;
  const year = parseInt(dateParts[2], 10) || 2000;

  let hours = 0, mins = 0, secs = 0;
  if (parts.length > 1) {
    const timeParts = parts[1].split(':');
    hours = parseInt(timeParts[0], 10) || 0;
    mins = parseInt(timeParts[1], 10) || 0;
    secs = parseInt(timeParts[2], 10) || 0;
  }

  // YYYYMMDDHHmmss numeric
  return year * 10000000000 + month * 100000000 + day * 1000000 + hours * 10000 + mins * 100 + secs;
};

// Extract phone digits and remove leading 0 if 11 digits starting with 0 (e.g. 011988887777 -> 11988887777)
export const cleanPhone = (value: any): string => {
  let raw = normalizePhone(value);
  if (raw.length > 10 && raw.startsWith('0')) {
    raw = raw.substring(1);
  }
  return raw;
};

// Split CSV line handling quotes and delimiter
export const splitCSVLine = (line: string, delimiter = ';'): string[] => {
  const res: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      res.push(cur);
      cur = '';
    } else {
      cur += char;
    }
  }
  res.push(cur);
  return res;
};

// Parse Call Results CSV (Resultado de Chamadas)
export const parseResultadoChamadas = (csvText: string): ParsedResultadoChamadas => {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) {
    return { distinctResultados: [], latestCallMap: new Map(), totalRows: 0, uniquePhonesCount: 0 };
  }

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const rawHeaders = splitCSVLine(lines[0], delimiter).map(h => h.replace(/^\uFEFF/, '').trim());
  const normHeaders = rawHeaders.map(h => normalizeString(h));

  const telIdx = normHeaders.findIndex(h => h.includes('TELEFONE') || h.includes('FONE') || h.includes('NUMERO'));
  const dtIdx = normHeaders.findIndex(h => h.includes('DATA') || h.includes('HORA') || h.includes('CREATED'));
  const resIdx = normHeaders.findIndex(h => h.includes('RESULTADO'));

  if (telIdx === -1 || resIdx === -1) {
    throw new Error('O arquivo de Resultado de Chamadas precisa conter as colunas "Telefone" e "Resultado".');
  }

  const latestCallMap = new Map<string, CallRecord>();
  const distinctSet = new Set<string>();
  let totalRows = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i], delimiter);
    if (cols.length <= Math.max(telIdx, resIdx)) continue;

    totalRows++;
    const phone = cleanPhone(cols[telIdx]);
    if (!phone) continue;

    const resultado = cols[resIdx] ? cols[resIdx].trim() : '';
    if (resultado) {
      distinctSet.add(resultado);
    }

    const dtRaw = dtIdx !== -1 && cols[dtIdx] ? cols[dtIdx].trim() : '';
    const timestamp = parseDateTimeToTimestamp(dtRaw);

    const existing = latestCallMap.get(phone);
    if (!existing || timestamp >= existing.timestamp) {
      latestCallMap.set(phone, {
        dateTimeRaw: dtRaw,
        timestamp,
        resultado
      });
    }
  }

  const sortedResultados = Array.from(distinctSet).sort();

  return {
    distinctResultados: sortedResultados,
    latestCallMap,
    totalRows,
    uniquePhonesCount: latestCallMap.size
  };
};

// Parse Last Interaction CSV (Última Interação)
export const parseUltimaInteracao = (csvText: string): ParsedUltimaInteracao => {
  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) {
    return { distinctInteracoes: [], latestInterMap: new Map(), totalRows: 0, uniquePhonesCount: 0 };
  }

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const rawHeaders = splitCSVLine(lines[0], delimiter).map(h => h.replace(/^\uFEFF/, '').trim());
  const normHeaders = rawHeaders.map(h => normalizeString(h));

  const telIdx = normHeaders.findIndex(h => h.includes('TELEFONE') || h.includes('FONE') || h.includes('NUMERO'));
  const dtIdx = normHeaders.findIndex(h => h.includes('DATA') || h.includes('HORA') || h.includes('CREATED'));
  let descIdx = normHeaders.findIndex(h => h.includes('DESCRICAO'));
  if (descIdx === -1) {
    descIdx = normHeaders.findIndex(h => h.includes('INTERA') && !h.includes('ID'));
  }

  if (telIdx === -1 || descIdx === -1) {
    throw new Error('O arquivo de Última Interação precisa conter as colunas "Telefone" e "Descrição Interação".');
  }

  const latestInterMap = new Map<string, InteractionRecord>();
  const distinctSet = new Set<string>();
  let totalRows = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i], delimiter);
    if (cols.length <= Math.max(telIdx, descIdx)) continue;

    totalRows++;
    const phone = cleanPhone(cols[telIdx]);
    if (!phone) continue;

    const descInteracao = cols[descIdx] ? cols[descIdx].trim() : '';
    if (descInteracao) {
      distinctSet.add(descInteracao);
    }

    const dtRaw = dtIdx !== -1 && cols[dtIdx] ? cols[dtIdx].trim() : '';
    const timestamp = parseDateTimeToTimestamp(dtRaw);

    const existing = latestInterMap.get(phone);
    if (!existing || timestamp >= existing.timestamp) {
      latestInterMap.set(phone, {
        dateTimeRaw: dtRaw,
        timestamp,
        descInteracao
      });
    }
  }

  const sortedInteracoes = Array.from(distinctSet).sort();

  return {
    distinctInteracoes: sortedInteracoes,
    latestInterMap,
    totalRows,
    uniquePhonesCount: latestInterMap.size
  };
};

// Preferences persistence
export const getStoredReciclagemPreferences = (): ReciclagemPreferences => {
  try {
    const raw = localStorage.getItem(REFRESH_PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.selectedResultados) && Array.isArray(parsed.selectedInteracoes)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse stored reciclagem preferences:', e);
  }
  return {
    selectedResultados: DEFAULT_UNPRODUCTIVE_RESULTADOS,
    selectedInteracoes: DEFAULT_UNPRODUCTIVE_INTERACOES
  };
};

export const saveStoredReciclagemPreferences = (prefs: ReciclagemPreferences): void => {
  try {
    localStorage.setItem(REFRESH_PREFS_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error('Failed to save reciclagem preferences:', e);
  }
};

// Cross-reference base and generate recycled copy CSV
export const processReciclagemBase = (
  baseCsvText: string,
  baseFileName: string,
  latestCallMap: Map<string, CallRecord>,
  latestInterMap: Map<string, InteractionRecord>,
  selectedResultadosToRemove: Set<string>,
  selectedInteracoesToRemove: Set<string>
): ReciclagemResult => {
  const lines = baseCsvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) {
    throw new Error('O arquivo da Base de Leads está vazio.');
  }

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headerLine = lines[0];
  const rawHeaders = splitCSVLine(headerLine, delimiter).map(h => h.replace(/^\uFEFF/, '').trim());
  const normHeaders = rawHeaders.map(h => normalizeString(h));

  const phoneColIdx = normHeaders.findIndex(h => h.includes('TELEFONE') || h.includes('FONE') || h.includes('NUMERO') || h.includes('TEL'));
  if (phoneColIdx === -1) {
    throw new Error('Não foi encontrada a coluna de telefone na Base de Leads. Verifique os cabeçalhos.');
  }

  // Pre-normalize sets for resilient matching
  const normResultadosToRemove = new Set(Array.from(selectedResultadosToRemove).map(s => normalizeString(s)));
  const normInteracoesToRemove = new Set(Array.from(selectedInteracoesToRemove).map(s => normalizeString(s)));

  let keptRowsCount = 0;
  let removedRowsCount = 0;
  let removedByCallCount = 0;
  let removedByInterCount = 0;
  let removedByBothCount = 0;

  const keptLines: string[] = [headerLine];
  const sampleRemoved: Array<{ phone: string; reason: string; rowSnippet: string }> = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const cols = splitCSVLine(rawLine, delimiter);
    if (cols.length <= phoneColIdx) continue;

    const phone = cleanPhone(cols[phoneColIdx]);
    if (!phone) {
      keptLines.push(rawLine);
      keptRowsCount++;
      continue;
    }

    const callInfo = latestCallMap.get(phone);
    const interInfo = latestInterMap.get(phone);

    const isRemovedByCall = !!callInfo && normResultadosToRemove.has(normalizeString(callInfo.resultado));
    const isRemovedByInter = !!interInfo && normInteracoesToRemove.has(normalizeString(interInfo.descInteracao));

    if (isRemovedByCall || isRemovedByInter) {
      removedRowsCount++;
      if (isRemovedByCall && isRemovedByInter) {
        removedByBothCount++;
      } else if (isRemovedByCall) {
        removedByCallCount++;
      } else {
        removedByInterCount++;
      }

      if (sampleRemoved.length < 50) {
        const reasons: string[] = [];
        if (isRemovedByCall && callInfo) reasons.push(`Resultado Chamada: ${callInfo.resultado}`);
        if (isRemovedByInter && interInfo) reasons.push(`Interação: ${interInfo.descInteracao}`);
        sampleRemoved.push({
          phone,
          reason: reasons.join(' | '),
          rowSnippet: cols.slice(0, 4).join('; ')
        });
      }
    } else {
      keptLines.push(rawLine);
      keptRowsCount++;
    }
  }

  let csvContent = '\uFEFF';
  csvContent += keptLines.join('\n') + '\n';

  const baseStem = baseFileName.replace(/\.[^/.]+$/, '');
  const outputFileName = `${baseStem}_copia.csv`;

  return {
    totalRows: lines.length - 1,
    keptRowsCount,
    removedRowsCount,
    removedByCallCount,
    removedByInterCount,
    removedByBothCount,
    outputFileName,
    csvContent,
    sampleRemoved
  };
};
