import { FlowCanvasStore, FlowBoard } from '../types';
import { saveStorageItem } from './syncService';

const STORAGE_KEY = 'demands_flow_canvas_store';

const DEFAULT_COLUMNS = [
  { id: 'col-1', name: 'Métrica' },
  { id: 'col-2', name: 'Valor' },
  { id: 'col-3', name: 'Delta %' }
];

export const INITIAL_BOARDS: FlowBoard[] = [];

export const getStoredFlowCanvasStore = (): FlowCanvasStore => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed: FlowCanvasStore = JSON.parse(raw);
      if (parsed.boards) {
        return parsed;
      }
    } catch (e) {
      console.error('Error loading Flow Canvas store:', e);
    }
  }
  return {
    boards: INITIAL_BOARDS,
    activeBoardId: ''
  };
};

import { supabase } from './supabaseClient';

export const saveStoredFlowCanvasStore = (store: FlowCanvasStore): void => {
  saveStorageItem('flow_canvas', STORAGE_KEY, store);
  const client = supabase;
  if (client) {
    client.auth.getUser().then(({ data }) => {
      if (data.user) {
        client.from('flow_canvas').upsert({
          user_id: data.user!.id,
          nodes: store.boards,
          edges: [{ activeBoardId: store.activeBoardId }],
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' }).then(({ error }) => {
          if (error) console.error('Supabase flow_canvas upsert error:', error);
        });
      }
    });
  }
};
