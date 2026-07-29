import { KanbanStore, KanbanCard, KanbanColumn, KanbanTag } from '../types';

const STORAGE_KEY = 'demands_kanban_store';

export const INITIAL_KANBAN_TAGS: KanbanTag[] = [
  { id: 'tag-leadsale', name: 'Leadsale', color: '#334155', textColor: '#F8FAFC' },
  { id: 'tag-dm9', name: 'DM9', color: '#EF4444', textColor: '#FFFFFF' },
  { id: 'tag-aliancasul', name: 'Aliança Sul', color: '#10B981', textColor: '#FFFFFF' },
  { id: 'tag-celebra', name: 'Celebra', color: '#06B6D4', textColor: '#FFFFFF' },
  { id: 'tag-m10', name: 'M10', color: '#F59E0B', textColor: '#FFFFFF' }
];

export const INITIAL_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: 'col-escritorios', title: 'Escritórios', color: '#F87171', order: 0 },
  { id: 'col-afazer', title: 'A Fazer', color: '#FACC15', order: 1 },
  { id: 'col-fazendo', title: 'Fazendo', color: '#38BDF8', order: 2 },
  { id: 'col-importante', title: 'Importante', color: '#A855F7', order: 3 },
  { id: 'col-feito', title: 'Feito', color: '#4ADE80', order: 4 },
  { id: 'col-ideias', title: 'Ideias', color: '#94A3B8', order: 5 }
];

export const INITIAL_KANBAN_CARDS: KanbanCard[] = [
  // Column: Escritórios
  {
    id: 'card-esc-1',
    columnId: 'col-escritorios',
    title: 'DM9',
    subtitle: 'PRIORIDADE',
    description: 'Escritório DM9 - Gestão de Metas e Lançamentos Diários',
    tags: ['DM9'],
    color: 'rose',
    createdAt: '2026-07-22T10:00:00Z'
  },
  {
    id: 'card-esc-2',
    columnId: 'col-escritorios',
    title: 'M10',
    subtitle: 'PRIORIDADE 2',
    description: 'Escritório M10 - Performance e Acompanhamento de Disparos',
    tags: ['M10'],
    color: 'amber',
    createdAt: '2026-07-22T10:00:00Z'
  },
  {
    id: 'card-esc-3',
    columnId: 'col-escritorios',
    title: 'Aliança Sul',
    subtitle: 'PRIORIDADE 3',
    description: 'Escritório Aliança Sul - Operação Receptiva e Abandonadas',
    tags: ['Aliança Sul'],
    color: 'emerald',
    createdAt: '2026-07-22T10:00:00Z'
  },
  {
    id: 'card-esc-4',
    columnId: 'col-escritorios',
    title: 'Celebra',
    subtitle: 'PRIORIDADE 4',
    description: 'Escritório Celebra - IA Evolutiva e Tabulações URA',
    tags: ['Celebra'],
    color: 'cyan',
    createdAt: '2026-07-22T10:00:00Z'
  },

  // Column: A Fazer
  {
    id: 'card-af-1',
    columnId: 'col-afazer',
    title: 'Atualizar Blocklists',
    description: 'Realizar o cruzamento das bases de opt-out no sistema cruzador blocklist',
    tags: [],
    createdAt: '2026-07-22T10:00:00Z'
  },
  {
    id: 'card-af-2',
    columnId: 'col-afazer',
    title: 'Estudar Possibilidades de Apresentações para Clientes em Daily',
    dueDate: '2026-07-22',
    tags: ['Leadsale'],
    createdAt: '2026-07-22T10:00:00Z'
  },
  {
    id: 'card-af-3',
    columnId: 'col-afazer',
    title: 'Testar Enriquecimento Manual de Telefones',
    dueDate: '2026-07-24',
    tags: ['Leadsale'],
    createdAt: '2026-07-22T10:00:00Z'
  },
  {
    id: 'card-af-4',
    columnId: 'col-afazer',
    title: 'Verificar Telefones da Blocklist',
    dueDate: '2026-07-22',
    tags: ['Aliança Sul'],
    createdAt: '2026-07-22T10:00:00Z'
  },

  // Column: Fazendo
  {
    id: 'card-fz-1',
    columnId: 'col-fazendo',
    title: 'Estudo IA Evolutiva',
    subtitle: 'ANÁLISE COM JOÃO SOBRE O COMPORTAMENTO E FILTROS DA IA EVOLUTIVA',
    description: 'Validação dos modelos comportamentais e filtros da IA Evolutiva em conjunto com a equipe técnica.',
    dueDate: '2026-07-22',
    tags: ['Celebra', 'Leadsale'],
    createdAt: '2026-07-22T10:00:00Z'
  },
  {
    id: 'card-fz-2',
    columnId: 'col-fazendo',
    title: 'Reunir todos os Materiais de Apresentação Existentes',
    dueDate: '2026-07-22',
    tags: ['Leadsale'],
    createdAt: '2026-07-22T10:00:00Z'
  },
  {
    id: 'card-fz-3',
    columnId: 'col-fazendo',
    title: 'Estudar Telefones do Enriquecimento',
    subtitle: 'ANÁLISE COM JOÃO SOBRE O DESEMPENHO E RESULTADO DOS TELEFONES ENRIQUECIDOS',
    dueDate: '2026-07-24',
    tags: ['Leadsale'],
    createdAt: '2026-07-22T10:00:00Z'
  },
  {
    id: 'card-fz-4',
    columnId: 'col-fazendo',
    title: 'Análise Tabulação',
    dueDate: '2026-07-24',
    tags: ['Celebra'],
    createdAt: '2026-07-22T10:00:00Z'
  },

  // Column: Importante
  {
    id: 'card-imp-1',
    columnId: 'col-importante',
    title: 'Validar Remoção das Naturezas Jurídicas',
    dueDate: '2026-07-22',
    tags: ['Celebra'],
    createdAt: '2026-07-22T10:00:00Z'
  },

  // Column: Feito
  {
    id: 'card-ft-1',
    columnId: 'col-feito',
    title: 'Teste 500K API | Manhã e Tarde',
    subtitle: 'VALIDAR COM JOÃO E SUBIR O MESMO ARQUIVO NA MANHÃ E À TARDE PARA VALIDAR COMPORTAMENTO DA API',
    dueDate: '2026-07-21',
    tags: ['Leadsale'],
    createdAt: '2026-07-21T10:00:00Z'
  },
  {
    id: 'card-ft-2',
    columnId: 'col-feito',
    title: 'Base Lemit',
    dueDate: '2026-07-22',
    tags: ['DM9'],
    createdAt: '2026-07-22T10:00:00Z'
  },
  {
    id: 'card-ft-3',
    columnId: 'col-feito',
    title: 'Base IA Evolutiva',
    dueDate: '2026-07-22',
    tags: ['Aliança Sul'],
    createdAt: '2026-07-22T10:00:00Z'
  },
  {
    id: 'card-ft-4',
    columnId: 'col-feito',
    title: 'Montar Excel de Acompanhamento Diário e Mensal dos Escritórios',
    dueDate: '2026-07-24',
    tags: ['Leadsale'],
    createdAt: '2026-07-22T10:00:00Z'
  },
  {
    id: 'card-ft-5',
    columnId: 'col-feito',
    title: 'Estudar SMS',
    dueDate: '2026-07-27',
    tags: ['M10'],
    createdAt: '2026-07-22T10:00:00Z'
  },

  // Column: Ideias
  {
    id: 'card-id-1',
    columnId: 'col-ideias',
    title: 'Plataforma para acompanhamento de Conversão',
    tags: ['Leadsale'],
    createdAt: '2026-07-22T10:00:00Z'
  }
];

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
