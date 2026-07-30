import { NotesStore, NoteFolder, NoteItem } from '../types';
import { saveStorageItem, getStorageItem, getUserScopedLocalKey } from './syncService';

const STORAGE_KEY = 'demands_notes_store';

export const INITIAL_FOLDERS: NoteFolder[] = [
  { id: 'folder-geral', name: 'Geral', color: '#38BDF8', isPinned: true, createdAt: new Date().toISOString() },
  { id: 'folder-reunioes', name: 'Reuniões & Alinhamentos', color: '#F59E0B', isPinned: true, createdAt: new Date().toISOString() },
  { id: 'folder-ideias', name: 'Ideias & Automações', color: '#A855F7', isPinned: false, createdAt: new Date().toISOString() }
];

export const INITIAL_NOTES: NoteItem[] = [];

export const getStoredNotesStore = (): NotesStore => {
  const scopedLocalKey = getUserScopedLocalKey(STORAGE_KEY);
  const raw = localStorage.getItem(scopedLocalKey);
  if (raw) {
    try {
      const parsed: NotesStore = JSON.parse(raw);
      if (parsed.folders && parsed.notes) {
        return parsed;
      }
    } catch (e) {
      console.error(e);
    }
  }
  return {
    folders: INITIAL_FOLDERS,
    notes: INITIAL_NOTES
  };
};

export const getStoredNotesStoreAsync = async (): Promise<NotesStore> => {
  const fallback = getStoredNotesStore();
  return await getStorageItem<NotesStore>('notes', STORAGE_KEY, fallback);
};

export const saveStoredNotesStore = (store: NotesStore): void => {
  saveStorageItem('notes', STORAGE_KEY, store);
};
