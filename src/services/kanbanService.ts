import { KanbanStore, KanbanCard, KanbanColumn, KanbanTag } from '../types';

const STORAGE_KEY = 'demands_kanban_store';

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
  const raw = localStorage.getItem(STORAGE_KEY);
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

import { saveStorageItem } from './syncService';
import { supabase } from './supabaseClient';

export const saveStoredKanban = (store: KanbanStore): void => {
  saveStorageItem('kanban', STORAGE_KEY, store);
  const client = supabase;
  if (client) {
    client.auth.getUser().then(({ data }) => {
      if (data.user) {
        const rows = store.cards.map(card => ({
          user_id: data.user!.id,
          card_id: card.id,
          column_id: card.columnId,
          title: card.title,
          description: card.description || '',
          priority: card.subtitle || 'Media',
          due_date: card.dueDate || null,
          office_tag: card.tags && card.tags.length > 0 ? card.tags[0] : null
        }));
        if (rows.length > 0) {
          client.from('kanban_cards').upsert(rows, { onConflict: 'user_id,card_id' }).then(({ error }) => {
            if (error) console.error('Supabase kanban upsert error:', error);
          });
        }
      }
    });
  }
};

export const formatDueDateBadge = (dueDateStr?: string): { text: string, isOverdue: boolean, isToday: boolean } => {
  if (!dueDateStr) return { text: '', isOverdue: false, isToday: false };

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const today = new Date(todayStr + 'T12:00:00Z');
  const target = new Date(dueDateStr + 'T12:00:00Z');

  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const dayNum = target.getUTCDate();
  const monthName = target.toLocaleDateString('pt-BR', { month: 'short', timeZone: 'UTC' }).replace('.', '');
  const formattedDateStr = `${dayNum} de ${monthName}.`;

  if (diffDays === 0) {
    return { text: `${formattedDateStr} hoje`, isOverdue: false, isToday: true };
  } else if (diffDays < 0) {
    const pastDays = Math.abs(diffDays);
    const pastDaysText = pastDays === 1 ? '1 dia' : `${pastDays} dias`;
    return { text: `${formattedDateStr} há ${pastDaysText}`, isOverdue: true, isToday: false };
  } else {
    const futureDaysText = diffDays === 1 ? '1 dia' : `${diffDays} dias`;
    return { text: `${formattedDateStr} em ${futureDaysText}`, isOverdue: false, isToday: false };
  }
};
