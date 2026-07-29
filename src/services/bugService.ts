import { BugReport, BugSeverity, BugFrequency, BugStatus } from '../types';
import { getStorageItem, saveStorageItem } from './syncService';

export const STORAGE_KEY = 'bugs';
export const LOCAL_KEY = 'demands_bug_reports_v1';

export interface SystemModuleCategory {
  module: string;
  sections: string[];
}

export const SYSTEM_MODULES: SystemModuleCategory[] = [
  {
    module: 'OPERAÇÕES',
    sections: [
      'Extração › Extrair CNPJs',
      'Extração › Histórico',
      'Extração › Agendamentos',
      'Extração › CNPJs Novos',
      'Estudos',
      'Enriquecimento',
      'Meu Extrato',
      'Telefones',
      'Consultar CNPJ',
      'Dashboard Operacional',
      'Transferências'
    ]
  },
  {
    module: 'CRM',
    sections: [
      'CRM › Dashboard',
      'CRM › Real Time',
      'CRM › Configurações',
      'CRM › Teste CRM'
    ]
  },
  {
    module: 'C6 BANK & API C6',
    sections: [
      'Gestão C6 › Dashboard',
      'Gestão C6 › Perf. Empresas',
      'Gestão C6 › Perf. Operadores',
      'Gestão C6 › Atribuir Empresas',
      'Gestão C6 › Consulta Chamadas',
      'Integração C6 › Validar',
      'Integração C6 › Histórico API'
    ]
  },
  {
    module: 'SISTEMA & ADMIN',
    sections: [
      'Admin › Dashboard',
      'Admin › Validar Impeditivos C6',
      'Admin › Transferências',
      'Admin › Extração',
      'Admin › Histórico',
      'Admin › Backtest',
      'Admin › Inserir CNPJs',
      'Admin › Auditoria Mailing',
      'Admin › Listas de Impeditivos'
    ]
  },
  {
    module: 'FERRAMENTAS',
    sections: [
      'Ferramentas › Kanban',
      'Ferramentas › Draw'
    ]
  },
  {
    module: 'DEMANDS PLATAFORMA',
    sections: [
      'Plataforma › Início',
      'Plataforma › Dashboard Operacional',
      'Plataforma › Lançamento Diário',
      'Plataforma › Kanban de Demandas',
      'Plataforma › Agenda & Google Calendar',
      'Plataforma › Bloco de Notas',
      'Plataforma › Conversor de Leads',
      'Plataforma › Cruzador Blocklist',
      'Plataforma › Geração de Abandonadas',
      'Plataforma › Reciclagem',
      'Plataforma › Resumo Semanal/Mensal',
      'Plataforma › Base de Dados',
      'Plataforma › Escritórios & Metas'
    ]
  }
];

export const INITIAL_BUGS: BugReport[] = [
  {
    id: 'bug-101',
    title: 'Falha na Validação de Impeditivos C6 durante importação de Mailing',
    description: 'Ao rodar o validador de impeditivos na tela Admin › Validar Impeditivos C6, requisições paralelas retornam erro 504 Gateway Timeout para lotes maiores que 500 CNPJs.',
    reproductionSteps: '1. Acessar Admin › Validar Impeditivos C6.\n2. Subir arquivo XLSX com mais de 500 CNPJs.\n3. Clicar em Executar Validação.\n4. Ocorrem falhas de timeout após 30 segundos.',
    systemModule: 'SISTEMA & ADMIN',
    systemSection: 'Admin › Validar Impeditivos C6',
    severity: 'critico',
    frequency: 'sempre_100',
    offices: ['DM9', 'Aliança Sul', 'Celebra', 'M10'],
    images: [],
    status: 'em_analise',
    reportedBy: 'Augusto (Admin)',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: 'bug-102',
    title: 'Divergência de Contas na Perf. Operadores em Horário de Pico',
    description: 'O relatório de Performance de Operadores do módulo C6 Bank apresenta contagem zerada de chamadas ativas nos intervalos entre 14:00 e 15:30 para o escritório Aliança Sul.',
    reproductionSteps: '1. Abrir C6 Bank › Gestão C6 › Perf. Operadores.\n2. Selecionar o escritório Aliança Sul.\n3. Comparar histórico de chamadas com o log bruto.',
    systemModule: 'C6 BANK & API C6',
    systemSection: 'Gestão C6 › Perf. Operadores',
    severity: 'alto',
    frequency: 'duas_cinco',
    offices: ['Aliança Sul'],
    images: [],
    status: 'aberto',
    reportedBy: 'Equipe de Operações',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 'bug-103',
    title: 'Atraso de Sincronismo na API C6 (Histórico API)',
    description: 'A resposta do endpoint de retorno do Histórico da API C6 apresenta delay de até 15 minutos na atualização do status da proposta.',
    reproductionSteps: '1. Acessar Integração C6 › Histórico API.\n2. Filtrar por propostas da última hora.\n3. Notar que o status pendente não atualiza sem dar F5.',
    systemModule: 'C6 BANK & API C6',
    systemSection: 'Integração C6 › Histórico API',
    severity: 'medio',
    frequency: 'intermitente',
    offices: ['DM9', 'Celebra'],
    images: [],
    status: 'em_correcao',
    reportedBy: 'Dev Team',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
  }
];

export async function getStoredBugs(): Promise<BugReport[]> {
  return await getStorageItem<BugReport[]>(STORAGE_KEY, LOCAL_KEY, INITIAL_BUGS);
}

export async function saveStoredBugs(bugs: BugReport[]): Promise<void> {
  await saveStorageItem<BugReport[]>(STORAGE_KEY, LOCAL_KEY, bugs);
}

export function getSeverityBadge(severity: BugSeverity) {
  switch (severity) {
    case 'critico':
      return { label: 'CRÍTICO', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40', dot: 'bg-rose-500' };
    case 'alto':
      return { label: 'ALTO', bg: 'bg-orange-500/20 text-orange-300 border-orange-500/40', dot: 'bg-orange-500' };
    case 'medio':
      return { label: 'MÉDIO', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40', dot: 'bg-amber-500' };
    case 'baixo':
      return { label: 'BAIXO', bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40', dot: 'bg-cyan-500' };
    default:
      return { label: 'DESCONHECIDO', bg: 'bg-slate-800 text-slate-400 border-slate-700', dot: 'bg-slate-500' };
  }
}

export function getFrequencyLabel(frequency: BugFrequency): string {
  switch (frequency) {
    case 'uma_vez':
      return 'Ocorreu 1 vez';
    case 'duas_cinco':
      return 'Ocorreu de 2 a 5 vezes';
    case 'sempre_100':
      return 'Sempre ocorre (100%)';
    case 'intermitente':
      return 'Intermitente (Aleatório)';
    default:
      return frequency;
  }
}

export function getStatusBadge(status: BugStatus) {
  switch (status) {
    case 'aberto':
      return { label: 'Aberto', bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30' };
    case 'em_analise':
      return { label: 'Em Análise', bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
    case 'em_correcao':
      return { label: 'Em Correção', bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' };
    case 'resolvido':
      return { label: 'Resolvido', bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
    case 'arquivado':
      return { label: 'Arquivado', bg: 'bg-slate-800 text-slate-400 border-slate-700' };
    default:
      return { label: status, bg: 'bg-slate-800 text-slate-400 border-slate-700' };
  }
}
