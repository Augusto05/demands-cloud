import { GeneratedFile } from '../types';
import { saveCSVContentToIDB, getCSVContentFromIDB, deleteCSVContentFromIDB } from './idbStorage';
import { saveStorageItem } from './syncService';

const STORAGE_KEYS = {
  GENERATED_FILES: 'demands_generated_files'
};

const memoryContentCache = new Map<string, string>();

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

export const cleanupExpiredGeneratedFiles = (): void => {
  const data = localStorage.getItem(STORAGE_KEYS.GENERATED_FILES);
  if (!data) return;

  try {
    const files: GeneratedFile[] = JSON.parse(data);
    const now = Date.now();

    const validFiles: GeneratedFile[] = [];
    let deletedCount = 0;

    files.forEach(f => {
      const createdAtMs = new Date(f.createdAt).getTime();
      const fileAge = now - (isNaN(createdAtMs) ? now : createdAtMs);
      
      if (fileAge > FIVE_DAYS_MS) {
        memoryContentCache.delete(f.id);
        deleteCSVContentFromIDB(f.id);
        deletedCount++;
      } else {
        validFiles.push(f);
      }
    });

    if (deletedCount > 0) {
      const metadataOnly = validFiles.map(({ content, ...meta }) => ({ ...meta, content: '' }));
      saveStorageItem('generated_files', STORAGE_KEYS.GENERATED_FILES, metadataOnly);
      console.log(`[Retenção de 5 Dias] ${deletedCount} arquivo(s) expirado(s) removidos do banco API e navegador.`);
    }
  } catch (e) {
    console.error('Erro na limpeza de arquivos com mais de 5 dias:', e);
  }
};

export const getStoredGeneratedFiles = (): GeneratedFile[] => {
  cleanupExpiredGeneratedFiles();
  const data = localStorage.getItem(STORAGE_KEYS.GENERATED_FILES);
  if (data) {
    try {
      const files: GeneratedFile[] = JSON.parse(data);
      return files.map(f => ({
        ...f,
        content: memoryContentCache.get(f.id) || f.content || ''
      }));
    } catch (e) {
      console.error('Failed to parse generated files from localStorage:', e);
    }
  }
  return [];
};

export const saveStoredGeneratedFiles = (files: GeneratedFile[]): void => {
  const metadataOnly = files.map(({ content, ...meta }) => ({ ...meta, content: '' }));
  saveStorageItem('generated_files', STORAGE_KEYS.GENERATED_FILES, metadataOnly);
};

export const addGeneratedFile = async (file: Omit<GeneratedFile, 'id' | 'createdAt'>): Promise<GeneratedFile> => {
  const id = `file_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const createdAt = new Date().toISOString();

  memoryContentCache.set(id, file.content);
  await saveCSVContentToIDB(id, file.content);

  const newFile: GeneratedFile = {
    ...file,
    id,
    createdAt
  };

  const existing = getStoredGeneratedFiles();
  const updated = [newFile, ...existing];
  saveStoredGeneratedFiles(updated);

  return newFile;
};

export const deleteGeneratedFile = (id: string): void => {
  memoryContentCache.delete(id);
  deleteCSVContentFromIDB(id);
  const existing = getStoredGeneratedFiles();
  const updated = existing.filter(f => f.id !== id);
  saveStoredGeneratedFiles(updated);
};

// Generic file downloader supporting both CSV text and XLSX Base64
export const downloadGeneratedFile = (fileName: string, content: string, fileType: 'xlsx' | 'csv' = 'csv'): void => {
  let blob: Blob;

  if (fileType === 'xlsx' || fileName.toLowerCase().endsWith('.xlsx')) {
    const byteCharacters = atob(content);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  } else {
    blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Backward compatibility alias
export const downloadCSVFile = downloadGeneratedFile;

// Interactive Native Save Dialog ("Salvar como...") for browsers with showSaveFilePicker
export const saveCSVFileWithPrompt = async (
  suggestedFileName: string, 
  content: string, 
  fileType: 'xlsx' | 'csv' = 'csv'
): Promise<boolean> => {
  const isXlsx = fileType === 'xlsx' || suggestedFileName.toLowerCase().endsWith('.xlsx');

  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: suggestedFileName,
        types: [{
          description: isXlsx ? 'Planilha Excel (*.xlsx)' : 'Arquivos CSV (*.csv)',
          accept: isXlsx 
            ? { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
            : { 'text/csv': ['.csv'] },
        }],
      });
      const writable = await handle.createWritable();
      
      if (isXlsx) {
        const byteCharacters = atob(content);
        const byteArray = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteArray[i] = byteCharacters.charCodeAt(i);
        }
        await writable.write(byteArray);
      } else {
        await writable.write(content);
      }
      
      await writable.close();
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return false;
      }
      console.warn('showSaveFilePicker failed, falling back to download:', err);
    }
  }

  // Fallback download if showSaveFilePicker is not supported or canceled
  downloadGeneratedFile(suggestedFileName, content, isXlsx ? 'xlsx' : 'csv');
  return true;
};

export const downloadGeneratedFileById = async (file: GeneratedFile, promptSaveAs = false): Promise<void> => {
  let content = memoryContentCache.get(file.id) || file.content;
  if (!content) {
    content = (await getCSVContentFromIDB(file.id)) || '';
  }

  if (!content) {
    alert('Conteúdo do arquivo não encontrado para download.');
    return;
  }

  const fType = file.fileType || (file.fileName.toLowerCase().endsWith('.xlsx') ? 'xlsx' : 'csv');

  if (promptSaveAs) {
    await saveCSVFileWithPrompt(file.fileName, content, fType);
  } else {
    downloadGeneratedFile(file.fileName, content, fType);
  }
};
