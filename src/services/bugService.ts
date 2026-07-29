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

export const INITIAL_BUGS: BugReport[] = [];

export async function getStoredBugs(): Promise<BugReport[]> {
  return await getStorageItem<BugReport[]>(STORAGE_KEY, LOCAL_KEY, INITIAL_BUGS);
}

import { supabase } from './supabaseClient';

export async function saveStoredBugs(bugs: BugReport[]): Promise<void> {
  await saveStorageItem<BugReport[]>(STORAGE_KEY, LOCAL_KEY, bugs);
  const client = supabase;
  if (client) {
    client.auth.getUser().then(({ data }) => {
      if (data.user) {
        const rows = bugs.map(b => ({
          user_id: data.user!.id,
          bug_id: b.id,
          title: b.title,
          description: b.description || '',
          reproduction_steps: b.reproductionSteps || '',
          system_module: b.systemModule || '',
          system_section: b.systemSection || '',
          severity: b.severity || 'medio',
          frequency: b.frequency || 'intermitente',
          offices: b.offices || [],
          images: b.images || [],
          status: b.status || 'aberto',
          reported_by: b.reportedBy || '',
          updated_at: new Date().toISOString()
        }));
        if (rows.length > 0) {
          client.from('bugs').upsert(rows, { onConflict: 'user_id,bug_id' }).then(({ error }) => {
            if (error) console.error('Supabase bugs upsert error:', error);
          });
        }
      }
    });
  }
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
