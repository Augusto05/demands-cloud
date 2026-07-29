import * as XLSX from 'xlsx';
import { AbandonadaRow } from '../types';

export const cleanPhoneFromCDR = (origemRaw: string): string => {
  if (!origemRaw) return '';
  const str = String(origemRaw);
  const beforeDID = str.includes('(DID') ? str.split('(DID')[0] : str;
  return beforeDID.replace(/\D/g, '').trim();
};

export const cleanCNPJ14 = (cnpjRaw: any): string => {
  if (!cnpjRaw) return '00000000000000';
  const digits = String(cnpjRaw).replace(/\D/g, '');
  if (digits.length === 0) return '00000000000000';
  return digits.padStart(14, '0');
};

const parseCSVLines = (csvText: string): { headers: string[], rows: Record<string, string>[] } => {
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

  const headers = parseLine(lines[0]).map(h => h.replace(/^\uFEFF/, '').replace(/^"/, '').replace(/"$/, '').trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      let val = cols[idx] !== undefined ? cols[idx] : '';
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }
      rowObj[h] = val.trim();
    });
    rows.push(rowObj);
  }

  return { headers, rows };
};

export const generateAbandonadasXLSXBase64 = (rows: AbandonadaRow[]): string => {
  const data = rows.map(r => ({
    'Telefone': String(r.telefone),
    'Razão Social': r.razaoSocial,
    'CNPJ': cleanCNPJ14(r.cnpj)
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Abandonadas');

  // Format CNPJ and Telefone columns as Text in Excel (@ format)
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:C1');
  for (let R = range.s.r + 1; R <= range.e.r; ++R) {
    const telCell = worksheet[XLSX.utils.encode_cell({ r: R, c: 0 })];
    if (telCell) {
      telCell.z = '@';
      telCell.t = 's';
    }
    const cnpjCell = worksheet[XLSX.utils.encode_cell({ r: R, c: 2 })];
    if (cnpjCell) {
      cnpjCell.z = '@';
      cnpjCell.t = 's';
    }
  }

  // Set column widths for clean Excel layout
  worksheet['!cols'] = [
    { wch: 18 }, // Telefone
    { wch: 45 }, // Razão Social
    { wch: 22 }  // CNPJ
  ];

  return XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
};

export interface ProcessAbandonadasResult {
  totalCDR: number;
  matchedCount: number;
  unmatchedCount: number;
  rows: AbandonadaRow[];
  xlsxBase64: string;
  defaultFileName: string;
}

export const processAbandonadasData = (
  cdrCsvText: string,
  uraCsvText: string,
  officeName = 'Aliança Sul'
): ProcessAbandonadasResult => {
  // Step 1: Parse CDR File
  const { headers: cdrHeaders, rows: cdrRows } = parseCSVLines(cdrCsvText);

  // Find column names flexibly
  const colRecursos = cdrHeaders.find(h => h.toLowerCase().includes('recurso')) || 'Recursos';
  const colOrigem = cdrHeaders.find(h => h.toLowerCase().includes('origem')) || 'Origem';

  const abandonedPhones: string[] = [];
  const seenPhones = new Set<string>();

  cdrRows.forEach(row => {
    const recursosRaw = (row[colRecursos] || '').trim();
    
    // Filter specifically by Recursos: "CAMPANHA: Receptiva AGV -> FLUXODISCAGEM -> FILA: Receptiva AGV" (or FILA without RAMAL)
    const isExactQueueAbandoned = 
      recursosRaw === 'CAMPANHA: Receptiva AGV -> FLUXODISCAGEM -> FILA: Receptiva AGV' ||
      (recursosRaw.includes('FILA:') && !recursosRaw.includes('-> RAMAL:'));

    if (isExactQueueAbandoned) {
      const tel = cleanPhoneFromCDR(row[colOrigem]);
      if (tel && tel.length >= 8 && !seenPhones.has(tel)) {
        seenPhones.add(tel);
        abandonedPhones.push(tel);
      }
    }
  });

  // Step 2: Parse URA Call Results Report (rep...csv)
  const { headers: uraHeaders, rows: uraRows } = parseCSVLines(uraCsvText);

  const colURATel = uraHeaders.find(h => h.toLowerCase().includes('telefone') || h.toLowerCase().includes('fone')) || 'Telefone';
  const colURAContato = uraHeaders.find(h => h.toLowerCase().includes('contato') || h.toLowerCase().includes('razao') || h.toLowerCase().includes('empresa')) || 'Contato';
  const colURACNPJ = uraHeaders.find(h => h.toLowerCase().includes('cnpj')) || 'CNPJ';

  // Build URA lookup dictionary
  const uraLookup = new Map<string, { razaoSocial: string, cnpj: string }>();

  uraRows.forEach(row => {
    const rawTel = row[colURATel] || '';
    const cleanTel = rawTel.replace(/\D/g, '');
    const razao = (row[colURAContato] || '').trim();
    const rawCNPJ = row[colURACNPJ] || '';
    const cnpj = cleanCNPJ14(rawCNPJ);

    if (cleanTel) {
      const info = { razaoSocial: razao, cnpj };
      uraLookup.set(cleanTel, info);
      if (cleanTel.length >= 10) uraLookup.set(cleanTel.slice(-10), info);
      if (cleanTel.length >= 11) uraLookup.set(cleanTel.slice(-11), info);
    }
  });

  // Step 3: Perform PROCV / VLOOKUP
  const resultRows: AbandonadaRow[] = [];
  let matchedCount = 0;
  let unmatchedCount = 0;

  abandonedPhones.forEach(phone => {
    const match = uraLookup.get(phone) || uraLookup.get(phone.slice(-11)) || uraLookup.get(phone.slice(-10));
    if (match && match.razaoSocial) {
      matchedCount++;
      resultRows.push({
        telefone: phone,
        razaoSocial: match.razaoSocial,
        cnpj: cleanCNPJ14(match.cnpj),
        foundInURA: true
      });
    } else {
      unmatchedCount++;
      resultRows.push({
        telefone: phone,
        razaoSocial: 'NÃO ENCONTRADO',
        cnpj: '00000000000000',
        foundInURA: false
      });
    }
  });

  // Step 4: Build Excel XLSX Output Content
  const xlsxBase64 = generateAbandonadasXLSXBase64(resultRows);

  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const cleanOffice = officeName.replace(/\s+/g, '_');
  const defaultFileName = `Abandonadas_${cleanOffice}_${todayStr}.xlsx`;

  return {
    totalCDR: abandonedPhones.length,
    matchedCount,
    unmatchedCount,
    rows: resultRows,
    xlsxBase64,
    defaultFileName
  };
};
