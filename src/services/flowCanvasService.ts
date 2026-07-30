import { FlowCanvasStore, FlowBoard } from '../types';
import { saveStorageItem, getUserScopedLocalKey } from './syncService';

const STORAGE_KEY = 'demands_flow_canvas_store';

export const INITIAL_BOARDS: FlowBoard[] = [];

export const getStoredFlowCanvasStore = (): FlowCanvasStore => {
  const scopedLocalKey = getUserScopedLocalKey(STORAGE_KEY);
  const raw = localStorage.getItem(scopedLocalKey);
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

export const saveStoredFlowCanvasStore = (store: FlowCanvasStore): void => {
  saveStorageItem('flow_canvas', STORAGE_KEY, store);
};
