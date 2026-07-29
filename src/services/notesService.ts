import { NotesStore, NoteFolder, NoteItem } from '../types';

const STORAGE_KEY = 'demands_notes_store';

export const INITIAL_FOLDERS: NoteFolder[] = [
  { id: 'folder-geral', name: 'Geral', color: '#38BDF8', isPinned: true, createdAt: new Date().toISOString() },
  { id: 'folder-reunioes', name: 'Reuniões & Alinhamentos', color: '#F59E0B', isPinned: true, createdAt: new Date().toISOString() },
  { id: 'folder-ideias', name: 'Ideias & Automações', color: '#A855F7', isPinned: false, createdAt: new Date().toISOString() }
];

export const INITIAL_NOTES: NoteItem[] = [];

import { saveStorageItem, getStorageItem } from './syncService';

export const getStoredNotesStore = (): NotesStore => {
  const raw = localStorage.getItem(STORAGE_KEY);
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

import { supabase } from './supabaseClient';

export const saveStoredNotesStore = (store: NotesStore): void => {
  saveStorageItem('notes', STORAGE_KEY, store);
  const client = supabase;
  if (client) {
    client.auth.getUser().then(({ data }) => {
      if (data.user) {
        client.from('notes_store').upsert({
          user_id: data.user!.id,
          folders: store.folders,
          notes: store.notes,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' }).then(({ error }) => {
          if (error) console.error('Supabase notes_store upsert error:', error);
        });
      }
    });
  }
};
