import { ConversorConfig } from '../types';

// Helper normalization
const norm = (s: string): string => {
  return s.toLowerCase().trim()
    .replace(/[áãâ]/g, 'a')
    .replace(/[éê]/g, 'e')
    .replace(/í/g, 'i')
    .replace(/[óõô]/g, 'o')
    .replace(/ú/g, 'u')
    .replace(/ç/g, 'c');
};

const colContainsAny = (colName: string, words: string[]): boolean => {
  const n = norm(colName);
  return words.some(w => n.includes(w));
};

const sampleColumnValues = (rows: Record<string, any>[], col: string, maxSamples = 30): string[] => {
  const vals: string[] = [];
  for (let i = 0; i < Math.min(rows.length, maxSamples); i++) {
    const v = rows[i][col];
    if (v !== undefined && v !== null && String(v).trim()) {
      vals.push(String(v).trim());
    }
  }
  return vals;
};

const looksLikeCNPJ = (values: string[]): boolean => {
  if (values.length === 0) return false;
  const matches = values.filter(v => v.replace(/\D/g, '').length === 14).length;
  return matches >= values.length * 0.7;
};

const looksLikePhone = (values: string[]): boolean => {
  if (values.length === 0) return false;
  const matches = values.filter(v => {
    const len = v.replace(/\D/g, '').length;
    return len >= 10 && len <= 11;
  }).length;
  return matches >= values.length * 0.7;
};

const looksLikeTextName = (values: string[]): boolean => {
  if (values.length === 0) return false;
  const matches = values.filter(v => /[a-zA-ZÀ-ÿ]{2,}/.test(v)).length;
  return matches >= values.length * 0.7;
};

const PALAVRAS_CNPJ = ['cnpj'];
const PALAVRAS_TELEFONE = ['telefone', 'tel', 'fone', 'celular', 'whatsapp', 'contato', 'numero'];
const PALAVRAS_RAZAO = ['razao', 'razão', 'empresa', 'social', 'fantasia', 'associad'];
const PALAVRAS_SOCIO = ['socio', 'sócio', 'nome', 'responsavel', 'responsável', 'titular', 'contato'];
const PALAVRAS_EXCLUIR_SOCIO_DE_RAZAO = ['socio', 'sócio'];

export interface DetectedColumnsMap {
  cnpj: string | null;
  telefone: string | null;
  razao_social: string | null;
  nome_socio: string | null;
}

export const detectColumns = (headers: string[], rows: Record<string, any>[]): DetectedColumnsMap => {
  const map: DetectedColumnsMap = {
    cnpj: null,
    telefone: null,
    razao_social: null,
    nome_socio: null
  };

  const cCNPJ = headers.filter(h => colContainsAny(h, PALAVRAS_CNPJ));
  const cTel = headers.filter(h => colContainsAny(h, PALAVRAS_TELEFONE));
  const cRazao = headers.filter(h => colContainsAny(h, PALAVRAS_RAZAO));
  const cSocio = headers.filter(h => colContainsAny(h, PALAVRAS_SOCIO));

  // 1. CNPJ
  for (const c of cCNPJ) {
    if (looksLikeCNPJ(sampleColumnValues(rows, c))) {
      map.cnpj = c;
      break;
    }
  }
  if (!map.cnpj) {
    for (const h of headers) {
      if (looksLikeCNPJ(sampleColumnValues(rows, h))) {
        map.cnpj = h;
        break;
      }
    }
  }

  // 2. TELEFONE
  for (const c of cTel) {
    if (looksLikePhone(sampleColumnValues(rows, c))) {
      map.telefone = c;
      break;
    }
  }
  if (!map.telefone) {
    for (const h of headers) {
      if (h === map.cnpj) continue;
      if (looksLikePhone(sampleColumnValues(rows, h))) {
        map.telefone = h;
        break;
      }
    }
  }

  // 3. RAZÃO SOCIAL
  const razaoValidas = cRazao.filter(c => looksLikeTextName(sampleColumnValues(rows, c)));
  if (razaoValidas.length > 0) {
    const prioRazao = razaoValidas.filter(c => colContainsAny(c, ['razao']));
    const prioEmpresa = razaoValidas.filter(c => colContainsAny(c, ['empresa', 'associad']));
    const prioFantasia = razaoValidas.filter(c => colContainsAny(c, ['fantasia']));
    map.razao_social = (prioRazao[0] || prioEmpresa[0] || prioFantasia[0] || razaoValidas[0]);
  }

  // 4. NOME DO SÓCIO
  const socioExplicito = cSocio.filter(c => 
    colContainsAny(c, PALAVRAS_EXCLUIR_SOCIO_DE_RAZAO) && looksLikeTextName(sampleColumnValues(rows, c))
  );
  if (socioExplicito.length > 0) {
    map.nome_socio = socioExplicito[0];
  } else {
    const outrasNome = cSocio.filter(c => c !== map.razao_social && looksLikeTextName(sampleColumnValues(rows, c)));
    if (outrasNome.length > 0) {
      map.nome_socio = outrasNome[0];
    } else if (map.razao_social) {
      map.nome_socio = map.razao_social;
    }
  }

  return map;
};

export const cleanRazaoSocial = (s: string): string => {
  if (!s || typeof s !== 'string') return '';
  return s.replace(/[^a-zA-ZÀ-ÿ\s]/g, '').trim();
};

export const cleanTelefone = (t: any): string => {
  if (!t) return '';
  return String(t).replace(/\D/g, '');
};

export const firstWord = (s: string): string => {
  if (!s || typeof s !== 'string') return '';
  return s.trim().split(/\s+/)[0] || '';
};

export const firstWordSocioList = (s: string): string => {
  if (!s || typeof s !== 'string') return '';
  const firstItem = s.split(/[,;|]/)[0].trim();
  return firstWord(firstItem);
};

export interface ProcessLeadsResult {
  totalRows: number;
  exportRows: number;
  removedRows: number;
  csvContent: string;
  detectedColumns: DetectedColumnsMap;
}

export const processLeadRows = (
  rows: Record<string, any>[],
  headers: string[],
  config: ConversorConfig
): ProcessLeadsResult => {
  const map = detectColumns(headers, rows);
  const total = rows.length;

  const colCNPJ = map.cnpj;
  const colTel = map.telefone;
  const colRazao = map.razao_social;
  const colSocio = map.nome_socio;

  const telsVistos = new Set<string>();
  const saida: Record<string, string>[] = [];

  rows.forEach(row => {
    const telRaw = colTel ? row[colTel] : '';
    const tel = cleanTelefone(telRaw);

    // Exact 11 digits requirement
    if (tel.length !== 11) return;

    // Deduplication check
    if (telsVistos.has(tel)) return;
    telsVistos.add(tel);

    const cnpjRaw = colCNPJ ? row[colCNPJ] : '';
    const cnpj = cleanTelefone(cnpjRaw).padStart(14, '0');

    const razaoRaw = colRazao ? String(row[colRazao] || '') : '';
    const socioRaw = colSocio ? String(row[colSocio] || '') : '';

    let razao = cleanRazaoSocial(razaoRaw);
    if (!razao) {
      razao = cleanRazaoSocial(firstWordSocioList(socioRaw) || socioRaw);
    }

    const socio = socioRaw ? firstWordSocioList(socioRaw) : firstWord(razaoRaw);

    if (config.layout === 'padrao') {
      saida.push({
        'Razão Social': razao,
        'CNPJ': `="${cnpj}"`,
        'Email': config.email,
        'Fluxo': config.fluxo,
        'Contratante': config.contratante,
        'DDD Telefone': `="${tel}"`
      });
    } else {
      saida.push({
        'Razão Social': razao,
        'Nome do Sócio': socio,
        'CNPJ': `="${cnpj}"`,
        'Email': config.email,
        'Fluxo 1': config.fluxo,
        'Fluxo 2': config.fluxo2,
        'Contratante': config.contratante,
        'DDD Telefone': `="${tel}"`
      });
    }
  });

  const exportCount = saida.length;
  const removedCount = total - exportCount;

  // Build CSV output with UTF-8 BOM (\uFEFF) and semicolon delimiter
  let csvContent = '\uFEFF';
  if (saida.length > 0) {
    const outHeaders = Object.keys(saida[0]);
    csvContent += outHeaders.join(';') + '\n';
    saida.forEach(row => {
      const line = outHeaders.map(h => {
        const val = row[h] || '';
        if (val.includes(';') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(';');
      csvContent += line + '\n';
    });
  }

  return {
    totalRows: total,
    exportRows: exportCount,
    removedRows: removedCount,
    csvContent,
    detectedColumns: map
  };
};

export const parseCSVTextToRows = (csvText: string): { headers: string[], rows: Record<string, any>[] } => {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const firstLine = lines[0];
  const delimiter = firstLine.split(';').length >= firstLine.split(',').length ? ';' : ',';

  const parseLine = (line: string): string[] => {
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
        res.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
    res.push(cur.trim());
    return res;
  };

  const headers = parseLine(lines[0]).map(h => h.replace(/^\uFEFF/, '').trim());
  const rows: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    const rowObj: Record<string, any> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = cols[idx] !== undefined ? cols[idx] : '';
    });
    rows.push(rowObj);
  }

  return { headers, rows };
};
