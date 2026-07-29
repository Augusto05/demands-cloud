export interface Office {
  id: string;
  name: string;
  dailyMeta: number;
  color: string;
}

export interface BaseDataRow {
  data: string; // YYYY-MM-DD
  escritorio: string;
  aba: string;
  boletos: number;
  meta_boletos: number;
  contas: number;
  conversao: number;
  semana: number;
  ano: number;
  mes: number;
}

export type HourlyRecord = Record<number, number>; // hour (9..17) -> boletos count

export interface OfficeDailyHourly {
  hourly: HourlyRecord;
  contas: number;
}

// Map of date string (e.g. "2026-07-21") -> OfficeName -> OfficeDailyHourly
export type DailyHourlyStore = Record<string, Record<string, OfficeDailyHourly>>;

export type PeriodFilter = 'hoje' | 'ontem' | '7dias' | 'mes' | 'custom';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface WeeklySummaryRow {
  escritorio: string;
  boletosAtual: number;
  boletosAnterior: number;
  variacaoBoletosPct: number;
  contasAtual: number;
  contasAnterior: number;
  variacaoContasPct: number;
  conversaoAtual: number;
  conversaoAnterior: number;
  variacaoConversaoPP: number;
}

export interface MonthlySummaryRow {
  escritorio: string;
  mediaBoletosAtual: number;
  mediaBoletosAnterior: number;
  variacaoBoletosPct: number;
  mediaContasAtual: number;
  mediaContasAnterior: number;
  variacaoContasPct: number;
  conversaoMediaAtual: number;
  conversaoMediaAnterior: number;
  variacaoConversaoPP: number;
}

export interface CalculatedHourlyMetrics {
  hour: number;
  boletos: number;
  mediaHora: number;
  metaHora: number;
  gapHora: number;
  projDia: number;
  metaDia: number;
  gapDia: number;
  contas: number;
  conversao: number;
}

// Automations Types
export interface ConversorConfig {
  email: string;
  fluxo: string;
  fluxo2: string;
  contratante: string;
  layout: 'padrao' | 'alieste';
}

export interface GeneratedFile {
  id: string;
  module: 'conversor' | 'cruzador' | 'abandonadas' | 'reciclagem';
  fileName: string;
  createdAt: string; // ISO date string
  totalRows: number;
  exportRows: number;
  removedRows: number;
  content: string; // CSV text content or XLSX Base64 string
  fileType?: 'xlsx' | 'csv';
}

export interface AbandonadaRow {
  telefone: string;
  razaoSocial: string;
  cnpj: string;
  foundInURA: boolean;
}

export interface BlocklistInfo {
  id: string;
  name: string;
  phoneCount: number;
  enabled: boolean;
  content?: string;
  createdAt?: string;
}

export interface AIInsight {
  id: string;
  type: 'positive' | 'warning' | 'alert' | 'info';
  title: string;
  description: string;
  actionableRecommendation: string;
  office?: string;
}

export interface KanbanTag {
  id: string;
  name: string;
  color: string; // HEX or Tailwind color
  textColor?: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  order: number;
}

export interface KanbanCard {
  id: string;
  columnId: string;
  title: string;
  subtitle?: string;
  description?: string;
  tags: string[]; // tag names or IDs
  dueDate?: string; // YYYY-MM-DD
  color?: string; // card accent color
  assignee?: string;
  createdAt: string; // ISO date string
}

export interface KanbanStore {
  columns: KanbanColumn[];
  cards: KanbanCard[];
  tags: KanbanTag[];
}

export interface NoteFolder {
  id: string;
  name: string;
  color?: string;
  isPinned?: boolean;
  createdAt: string;
}

export interface NoteItem {
  id: string;
  folderId: string;
  title: string;
  content: string; // Markdown / Rich HTML string
  officeTags: string[]; // e.g. ['DM9', 'Celebra']
  images?: string[]; // URLs or Base64 images
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotesStore {
  folders: NoteFolder[];
  notes: NoteItem[];
}

// Bug Report Types
export type BugSeverity = 'critico' | 'alto' | 'medio' | 'baixo';
export type BugFrequency = 'uma_vez' | 'duas_cinco' | 'sempre_100' | 'intermitente';
export type BugStatus = 'aberto' | 'em_analise' | 'em_correcao' | 'resolvido' | 'arquivado';

export interface BugReport {
  id: string;
  title: string;
  description: string;
  reproductionSteps?: string;
  systemModule: string; // e.g. "OPERAÇÕES", "CRM", "GESTÃO C6", "INTEGRAÇÃO C6", "ADMIN", "FERRAMENTAS", "DEMANDS"
  systemSection: string; // e.g. "Extração › Extrair CNPJs", "Gestão C6 › Perf. Operadores"
  severity: BugSeverity;
  frequency: BugFrequency;
  offices: string[]; // e.g. ['DM9', 'Aliança Sul', 'Celebra', 'M10']
  images: string[]; // Base64 screenshot strings
  status: BugStatus;
  reportedBy: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

// Flow Canvas (DER / Graph Canvas) Types
export interface FlowColumn {
  id: string;
  name: string;
}

export interface FlowMetricRow {
  id: string;
  values: Record<string, string | number>; // columnId -> cell text/value
  // Backward compatibility fallbacks
  metric?: string;
  value?: string;
  deltaPct?: number;
}

export interface FlowTableNodeData {
  label: string;
  iconName?: string;
  color?: string; // Theme color
  columns: FlowColumn[]; // Dynamic columns list
  rows: FlowMetricRow[];
}

export interface FlowBoard {
  id: string;
  name: string;
  description?: string;
  nodes: any[];
  edges: any[];
  createdAt: string;
  updatedAt: string;
}

export interface FlowCanvasStore {
  boards: FlowBoard[];
  activeBoardId: string;
}

