import { NotesStore, NoteFolder, NoteItem } from '../types';

const STORAGE_KEY = 'demands_notes_store';

export const INITIAL_FOLDERS: NoteFolder[] = [
  { id: 'folder-geral', name: 'Geral', color: '#38BDF8', isPinned: true, createdAt: '2026-07-22T10:00:00Z' },
  { id: 'folder-dm9', name: 'DM9', color: '#EF4444', isPinned: true, createdAt: '2026-07-22T10:00:00Z' },
  { id: 'folder-alianca', name: 'Aliança Sul', color: '#10B981', isPinned: false, createdAt: '2026-07-22T10:00:00Z' },
  { id: 'folder-celebra', name: 'Celebra', color: '#06B6D4', isPinned: false, createdAt: '2026-07-22T10:00:00Z' },
  { id: 'folder-reunioes', name: 'Reuniões & Alinhamentos', color: '#F59E0B', isPinned: true, createdAt: '2026-07-22T10:00:00Z' },
  { id: 'folder-ideias', name: 'Ideias & Automações', color: '#A855F7', isPinned: false, createdAt: '2026-07-22T10:00:00Z' }
];

export const INITIAL_NOTES: NoteItem[] = [
  {
    id: 'note-1',
    folderId: 'folder-dm9',
    title: 'Alinhamento Diário DM9 - Metas e Conversão',
    content: `# Alinhamento Diário DM9\n\n- [x] Validar volumetria de boletos da manhã (Meta: 500)\n- [x] Verificar taxa de conversão em contas abertas (37 contas ativas)\n- [ ] Acompanhar horário de pico entre 14h e 16h\n\n> **Observação:** As campanhas do DM9 apresentaram excelente engajamento no horário das 11h. Mantendo o ritmo ideal por hora (55/h).`,
    officeTags: ['DM9'],
    images: [],
    isPinned: true,
    createdAt: '2026-07-22T10:00:00Z',
    updatedAt: '2026-07-22T11:30:00Z'
  },
  {
    id: 'note-2',
    folderId: 'folder-celebra',
    title: 'Estratégia IA Evolutiva & Tabulações URA',
    content: `## Análise da IA Evolutiva Celebra\n\nInstruções para validação dos filtros da URA:\n\n1. Verificar código de desligamento da URA\n2. Confirmar chamadas de Atendimento Eletrônico\n3. Validar se a tabulação coincide com o relatório da campanha DM9\n\n\`\`\`json\n{\n  "campanha": "AGV C6 BANK - COMERCIAL DM9",\n  "status": "Atendido",\n  "filtro_recursos": "FILA: Receptiva AGV"\n}\n\`\`\``,
    officeTags: ['Celebra'],
    images: [],
    isPinned: true,
    createdAt: '2026-07-22T10:00:00Z',
    updatedAt: '2026-07-22T12:00:00Z'
  },
  {
    id: 'note-3',
    folderId: 'folder-reunioes',
    title: 'Anotações de Alinhamento com João',
    content: `# Pauta de Reunião\n\n1. **Conversor de Leads**: Implementar seletor interativo de diretório "Salvar como...".\n2. **Blocklist Anti-Join**: Validar remoção de 2.924 números bloqueados.\n3. **Abandonadas**: Extração de 15 telefones em fila.\n\n*Próximos passos:* Manter os scripts de automação sincronizados e armazenar o histórico na aplicação.`,
    officeTags: ['DM9', 'Celebra'],
    images: [],
    isPinned: false,
    createdAt: '2026-07-22T09:00:00Z',
    updatedAt: '2026-07-22T10:15:00Z'
  }
];

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

export const saveStoredNotesStore = (store: NotesStore): void => {
  saveStorageItem('notes', STORAGE_KEY, store);
};
