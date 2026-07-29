import { BlocklistInfo } from '../types';

export const normalizePhone = (value: any): string => {
  if (value === undefined || value === null) return '';
  return String(value).replace(/\D/g, '');
};

const PHONE_COLUMN_CANDIDATES = [
  'TELEFONE', 'DDDTELEFONE', 'FONE', 'CELULAR', 'NUMERO', 'NÚMERO', 'TEL', 'PHONE', 'WHATSAPP', 'CONTATO'
];

const normalizeHeader = (name: string): string => {
  if (!name) return '';
  let text = name.replace(/\ufeff/g, '').trim().toUpperCase();
  const accents: Record<string, string> = {
    'Á': 'A', 'À': 'A', 'Ã': 'A', 'Â': 'A',
    'É': 'E', 'È': 'E', 'Ê': 'E',
    'Í': 'I', 'Ì': 'I',
    'Ó': 'O', 'Ò': 'O', 'Õ': 'O', 'Ô': 'O',
    'Ú': 'U', 'Ù': 'U', 'Ç': 'C'
  };
  Object.entries(accents).forEach(([k, v]) => {
    text = text.replace(new RegExp(k, 'g'), v);
  });
  return text;
};

export const findPhoneColumnInHeaders = (headers: string[]): string | null => {
  const normMap = new Map<string, string>();
  headers.forEach(h => normMap.set(normalizeHeader(h), h));

  // 1. Exact candidate match
  for (const cand of PHONE_COLUMN_CANDIDATES) {
    const candNorm = normalizeHeader(cand);
    if (normMap.has(candNorm)) {
      return normMap.get(candNorm)!;
    }
  }

  // 2. Partial keyword match
  const keywords = ['TELEFONE', 'FONE', 'CELULAR', 'WHATSAPP', 'NUMERO', 'TEL', 'CONTATO'];
  for (const orig of headers) {
    const normH = normalizeHeader(orig);
    for (const kw of keywords) {
      if (normH.includes(kw)) {
        return orig;
      }
    }
  }

  return null;
};

export interface AntiJoinResult {
  totalRows: number;
  keptRows: number;
  removedRows: number;
  detectedPhoneCol: string;
  outputFileName: string;
  csvContent: string;
  blockedCount: number;
}

export const runAntiJoin = (
  inputRows: Record<string, any>[],
  headers: string[],
  inputFileName: string,
  blockedPhoneSet: Set<string>
): AntiJoinResult => {
  const phoneCol = findPhoneColumnInHeaders(headers);
  if (!phoneCol) {
    throw new Error(`Não foi encontrada nenhuma coluna de telefone na base selecionada. Colunas: ${headers.join(', ')}`);
  }

  const total = inputRows.length;
  const filteredRows: Record<string, any>[] = [];

  inputRows.forEach(row => {
    const phone = normalizePhone(row[phoneCol]);
    if (!blockedPhoneSet.has(phone)) {
      filteredRows.push(row);
    }
  });

  const keptCount = filteredRows.length;
  const removedCount = total - keptCount;

  // Build CSV output
  let csvContent = '\uFEFF';
  csvContent += headers.join(';') + '\n';

  filteredRows.forEach(row => {
    const line = headers.map(h => {
      const val = row[h] !== undefined && row[h] !== null ? String(row[h]) : '';
      if (val.includes(';') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(';');
    csvContent += line + '\n';
  });

  const baseStem = inputFileName.replace(/\.[^/.]+$/, '');
  const outputFileName = `${baseStem}_cruzada.csv`;

  return {
    totalRows: total,
    keptRows: keptCount,
    removedRows: removedCount,
    detectedPhoneCol: phoneCol,
    outputFileName,
    csvContent,
    blockedCount: blockedPhoneSet.size
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

// --- Blocklist Persistence Helpers ---
import { saveCSVContentToIDB, getCSVContentFromIDB, deleteCSVContentFromIDB } from './idbStorage';

const BLOCKLIST_STORAGE_KEY = 'demands_blocklists_metadata';

export const DEFAULT_BLOCKLISTS: BlocklistInfo[] = [
  { id: 'b1', name: 'Blocklist 1.csv', phoneCount: 150000, enabled: true },
  { id: 'b2', name: 'Blocklist 2.csv', phoneCount: 150000, enabled: true },
  { id: 'b3', name: 'Blocklist 3.csv', phoneCount: 150000, enabled: true },
  { id: 'np1', name: 'Nao Perturbe 1.csv', phoneCount: 2000000, enabled: true },
  { id: 'np2', name: 'Nao Perturbe 2.csv', phoneCount: 2000000, enabled: true },
  { id: 'np3', name: 'Nao Perturbe 3.csv', phoneCount: 2000000, enabled: true },
];

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

export const cleanupExpiredCustomBlocklists = (): void => {
  const raw = localStorage.getItem(BLOCKLIST_STORAGE_KEY);
  if (!raw) return;

  try {
    const list: BlocklistInfo[] = JSON.parse(raw);
    const defaultIds = new Set(DEFAULT_BLOCKLISTS.map(b => b.id));
    const now = Date.now();

    const validList: BlocklistInfo[] = [];
    let deletedCount = 0;

    list.forEach(bl => {
      if (defaultIds.has(bl.id)) {
        validList.push(bl);
        return;
      }

      if (bl.createdAt) {
        const createdAtMs = new Date(bl.createdAt).getTime();
        const age = now - (isNaN(createdAtMs) ? now : createdAtMs);
        if (age > FIVE_DAYS_MS) {
          deleteStoredBlocklistContent(bl.id);
          deletedCount++;
          return;
        }
      }
      validList.push(bl);
    });

    if (deletedCount > 0) {
      const cleanList = validList.map(({ content, ...rest }) => rest);
      localStorage.setItem(BLOCKLIST_STORAGE_KEY, JSON.stringify(cleanList));
      console.log(`[Limpeza Blocklist 5 Dias] ${deletedCount} blocklist(s) expirada(s) removida(s).`);
    }
  } catch (e) {
    console.error('Erro ao limpar blocklists expiradas:', e);
  }
};

export const getStoredBlocklistsMetadata = (): BlocklistInfo[] => {
  cleanupExpiredCustomBlocklists();
  const raw = localStorage.getItem(BLOCKLIST_STORAGE_KEY);
  if (raw) {
    try {
      const parsed: BlocklistInfo[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse blocklist metadata:', e);
    }
  }
  return DEFAULT_BLOCKLISTS;
};

export const saveStoredBlocklistsMetadata = (list: BlocklistInfo[]): void => {
  const cleanList = list.map(({ content, ...rest }) => rest);
  localStorage.setItem(BLOCKLIST_STORAGE_KEY, JSON.stringify(cleanList));
};

export const saveBlocklistContent = async (id: string, content: string): Promise<void> => {
  await saveCSVContentToIDB(`blocklist_${id}`, content);
};

export const getBlocklistContent = async (id: string): Promise<string | null> => {
  return await getCSVContentFromIDB(`blocklist_${id}`);
};

export const deleteStoredBlocklistContent = async (id: string): Promise<void> => {
  await deleteCSVContentFromIDB(`blocklist_${id}`);
};

