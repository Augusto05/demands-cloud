import { KanbanStore, KanbanCard, KanbanColumn, KanbanTag } from '../types';
import { saveStorageItem, getUserScopedLocalKey, getCurrentUsername } from './syncService';

const STORAGE_KEY = 'demands_kanban_store_v2';

export const INITIAL_KANBAN_TAGS: KanbanTag[] = [];

export const INITIAL_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'col-afazer', title: 'A Fazer', color: '#FACC15', order: 0 },
  { id: 'col-fazendo', title: 'Fazendo', color: '#38BDF8', order: 1 },
  { id: 'col-importante', title: 'Importante', color: '#A855F7', order: 2 },
  { id: 'col-feito', title: 'Feito', color: '#4ADE80', order: 3 },
  { id: 'col-ideias', title: 'Ideias', color: '#94A3B8', order: 4 }
];

export const INITIAL_KANBAN_CARDS: KanbanCard[] = [];

export const getStoredKanban = (): KanbanStore => {
  const scopedLocalKey = getUserScopedLocalKey(STORAGE_KEY);
  const raw = localStorage.getItem(scopedLocalKey);
  if (raw) {
    try {
      const parsed: KanbanStore = JSON.parse(raw);
      if (parsed.columns && parsed.cards && parsed.tags) {
        return parsed;
      }
    } catch (e) {
      console.error(e);
    }
  }
  return {
    columns: INITIAL_KANBAN_COLUMNS,
    cards: INITIAL_KANBAN_CARDS,
    tags: INITIAL_KANBAN_TAGS
  };
};

export const saveStoredKanban = (store: KanbanStore): void => {
  saveStorageItem('kanban', STORAGE_KEY, store);
};

export const formatDueDateBadge = (dueDate?: string): { text: string; isOverdue: boolean; isToday: boolean } | null => {
  if (!dueDate) return null;

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  if (dueDate === todayStr) {
    return { text: 'Hoje', isOverdue: false, isToday: true };
  }
  
  if (dueDate < todayStr) {
    return { text: 'Atrasado', isOverdue: true, isToday: false };
  }

  const [y, m, d] = dueDate.split('-');
  return { text: `${d}/${m}`, isOverdue: false, isToday: false };
};
