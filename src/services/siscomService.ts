import { SiscomDailyRecord, SiscomStore } from '../types';
import {
  getStorageItem,
  saveStorageItem,
  getUserScopedLocalKey,
  getCurrentUsername,
  isMasterAdmin,
  fetchConsolidatedAdminStorage
} from './syncService';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const STORAGE_KEY = 'demands_siscom_dashboard_store';
const CLOUD_KEY = 'siscom_dashboard';

export const getStoredSiscomStore = (): SiscomStore => {
  const scopedLocalKey = getUserScopedLocalKey(STORAGE_KEY);
  const raw = localStorage.getItem(scopedLocalKey);
  if (raw) {
    try {
      const parsed: SiscomStore = JSON.parse(raw);
      if (parsed && typeof parsed.records === 'object' && parsed.records !== null) {
        return parsed;
      }
    } catch (e) {
      console.error('[siscomService] Error parsing local store:', e);
    }
  }
  return { records: {} };
};

export const fetchSiscomStoreFromCloud = async (): Promise<SiscomStore> => {
  if (isMasterAdmin()) {
    const consolidated = await fetchConsolidatedAdminStorage();
    const adminDirect = await getStorageItem<SiscomStore>(CLOUD_KEY, STORAGE_KEY, { records: {} });
    const mergedRecords: Record<string, SiscomDailyRecord> = {
      ...(consolidated.siscomRecords || {}),
      ...(adminDirect.records || {})
    };
    return { records: mergedRecords };
  }
  return getStorageItem<SiscomStore>(CLOUD_KEY, STORAGE_KEY, { records: {} });
};

export const saveSiscomRecord = async (
  store: SiscomStore,
  record: SiscomDailyRecord
): Promise<SiscomStore> => {
  const updatedStore: SiscomStore = {
    records: {
      ...store.records,
      [record.date]: {
        ...record,
        updatedAt: new Date().toISOString()
      }
    }
  };

  // 1. Sync via Universal Cloud Collection (multi-device real-time sync)
  await saveStorageItem(CLOUD_KEY, STORAGE_KEY, updatedStore);

  // 2. Also sync to dedicated relational table siscom_daily_records
  if (supabase && isSupabaseConfigured) {
    try {
      const userKey = getCurrentUsername().trim().toLowerCase();
      await supabase.from('siscom_daily_records').upsert(
        {
          user_key: userKey,
          record_date: record.date,
          horas_rodadas: record.horasRodadas,
          total_transferencias: record.totalTransferencias,
          leads_indicados: record.leadsIndicados,
          contas_abertas: record.contasAbertas,
          produtividade_mailing: record.produtividadeMailing,
          improdutivos: record.improdutivos || 0,
          atritados: record.atritados,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_key,record_date' }
      );
    } catch (e) {
      console.warn('[siscomService] Relational table upsert warning:', e);
    }
  }

  return updatedStore;
};

export const deleteSiscomRecord = async (
  store: SiscomStore,
  date: string
): Promise<SiscomStore> => {
  const nextRecords = { ...store.records };
  delete nextRecords[date];
  const updatedStore: SiscomStore = { records: nextRecords };

  await saveStorageItem(CLOUD_KEY, STORAGE_KEY, updatedStore);

  if (supabase && isSupabaseConfigured) {
    try {
      const userKey = getCurrentUsername().trim().toLowerCase();
      await supabase
        .from('siscom_daily_records')
        .delete()
        .eq('user_key', userKey)
        .eq('record_date', date);
    } catch (e) {
      console.warn('[siscomService] Relational table delete warning:', e);
    }
  }

  return updatedStore;
};

// Calculation Helpers
export const calcMediaHora = (totalTransferencias: number, horasRodadas: number): number => {
  if (!horasRodadas || horasRodadas <= 0) return 0;
  return totalTransferencias / horasRodadas;
};

export const calcConversaoPct = (contasAbertas: number, leadsIndicados: number): number => {
  if (!leadsIndicados || leadsIndicados <= 0) return 0;
  return (contasAbertas / leadsIndicados) * 100;
};

export const calcDeltaPct = (currentValue: number, averageValue: number): number | null => {
  if (!averageValue || averageValue <= 0) return null;
  return ((currentValue - averageValue) / averageValue) * 100;
};

export interface SiscomComputedAverages {
  daysCount: number;
  avgTotalTransferencias: number;
  avgMediaHora: number;
  avgLeadsIndicados: number;
  avgContasAbertas: number;
  avgConversaoPct: number;
  avgProdutividadeMailing: number;
  avgImprodutivos: number;
  avgAtritados: number;
}

export const isWeekend = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  const day = dt.getDay();
  return day === 0 || day === 6;
};

/**
 * Computes system-wide historical averages across all valid stored weekdays (excluding weekends).
 */
export const computeSystemAverages = (
  recordsMap: Record<string, SiscomDailyRecord>
): SiscomComputedAverages => {
  const list = Object.values(recordsMap).filter(
    r =>
      !isWeekend(r.date) &&
      (r.totalTransferencias > 0 ||
        r.leadsIndicados > 0 ||
        r.contasAbertas > 0 ||
        r.produtividadeMailing > 0 ||
        (r.improdutivos || 0) > 0 ||
        r.atritados > 0)
  );

  const count = list.length;
  if (count === 0) {
    return {
      daysCount: 0,
      avgTotalTransferencias: 0,
      avgMediaHora: 0,
      avgLeadsIndicados: 0,
      avgContasAbertas: 0,
      avgConversaoPct: 0,
      avgProdutividadeMailing: 0,
      avgImprodutivos: 0,
      avgAtritados: 0
    };
  }

  const sumTransferencias = list.reduce((acc, r) => acc + (r.totalTransferencias || 0), 0);
  const sumLeads = list.reduce((acc, r) => acc + (r.leadsIndicados || 0), 0);
  const sumContas = list.reduce((acc, r) => acc + (r.contasAbertas || 0), 0);
  const sumProdMailing = list.reduce((acc, r) => acc + (r.produtividadeMailing || 0), 0);
  const sumImprodutivos = list.reduce((acc, r) => acc + (r.improdutivos || 0), 0);
  const sumAtritados = list.reduce((acc, r) => acc + (r.atritados || 0), 0);

  // For mediaHora, average across days that have mediaHora > 0
  const daysWithHours = list.filter(r => r.horasRodadas > 0 && r.totalTransferencias > 0);
  const avgMediaHora =
    daysWithHours.length > 0
      ? daysWithHours.reduce((acc, r) => acc + calcMediaHora(r.totalTransferencias, r.horasRodadas), 0) /
        daysWithHours.length
      : 0;

  // For conversaoPct, average across days that have leadsIndicados > 0
  const daysWithLeads = list.filter(r => r.leadsIndicados > 0);
  const avgConversaoPct =
    daysWithLeads.length > 0
      ? daysWithLeads.reduce((acc, r) => acc + calcConversaoPct(r.contasAbertas, r.leadsIndicados), 0) /
        daysWithLeads.length
      : 0;

  return {
    daysCount: count,
    avgTotalTransferencias: sumTransferencias / count,
    avgMediaHora,
    avgLeadsIndicados: sumLeads / count,
    avgContasAbertas: sumContas / count,
    avgConversaoPct,
    avgProdutividadeMailing: sumProdMailing / count,
    avgImprodutivos: sumImprodutivos / count,
    avgAtritados: sumAtritados / count
  };
};

export interface SiscomChartPoint {
  date: string; // YYYY-MM-DD
  shortLabel: string; // DD/MM
  leadsIndicados: number;
  contasAbertas: number;
  conversaoPct: number;
  totalTransferencias: number;
  hasData: boolean;
}

/**
 * Generates the 7-day comparative series ending at referenceDateStr (YYYY-MM-DD),
 * strictly ignoring weekends (Saturday & Sunday) and collecting the last 7 business days.
 */
export const getLast7DaysChartSeries = (
  recordsMap: Record<string, SiscomDailyRecord>,
  referenceDateStr: string
): SiscomChartPoint[] => {
  const [y, m, d] = referenceDateStr.split('-').map(Number);
  const refDate = new Date(y, (m || 1) - 1, d || 1);

  // If the reference date is on a weekend, roll back to the nearest previous weekday (Friday)
  while (refDate.getDay() === 0 || refDate.getDay() === 6) {
    refDate.setDate(refDate.getDate() - 1);
  }

  const series: SiscomChartPoint[] = [];
  const curDate = new Date(refDate);

  // Collect the 7 most recent working days (skip Saturday & Sunday)
  while (series.length < 7) {
    const dayOfWeek = curDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const yyyy = curDate.getFullYear();
      const mm = String(curDate.getMonth() + 1).padStart(2, '0');
      const dd = String(curDate.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;
      const rec = recordsMap[dateKey];

      series.push({
        date: dateKey,
        shortLabel: `${dd}/${mm}`,
        leadsIndicados: rec ? rec.leadsIndicados : 0,
        contasAbertas: rec ? rec.contasAbertas : 0,
        conversaoPct: rec ? calcConversaoPct(rec.contasAbertas, rec.leadsIndicados) : 0,
        totalTransferencias: rec ? rec.totalTransferencias : 0,
        hasData: !!rec
      });
    }
    curDate.setDate(curDate.getDate() - 1);
  }

  // Reverse so the series is in chronological order (oldest to newest)
  return series.reverse();
};

export interface SiscomChartAxes {
  leadsAxisMax: number;
  contasAxisMax: number;
  singleAxisMax: number;
}

/**
 * Computes harmonized Y-axis scales for Leads and Contas so Contas Abertas
 * is always visually proportioned and NEVER plotted higher than Leads Indicados.
 */
export const computeChartAxes = (
  series: SiscomChartPoint[],
  useDualAxis: boolean
): SiscomChartAxes => {
  const maxLeads = Math.max(10, ...series.map(d => d.leadsIndicados));
  const maxContas = Math.max(4, ...series.map(d => d.contasAbertas));
  const singleAxisMax = Math.ceil(Math.max(maxLeads, maxContas) * 1.2);
  const leadsAxisMax = Math.ceil(maxLeads * 1.15);

  if (!useDualAxis) {
    return {
      leadsAxisMax: singleAxisMax,
      contasAxisMax: singleAxisMax,
      singleAxisMax
    };
  }

  // Calculate the max ratio of contas to leads across points where leads > 0
  const maxDayRatio = Math.max(
    0.08,
    ...series.map(pt => {
      if (pt.leadsIndicados > 0 && pt.contasAbertas > 0) {
        return pt.contasAbertas / pt.leadsIndicados;
      }
      return 0;
    })
  );

  // Guarantee that on the peak conversion day, Contas is plotted at most at 70% of Leads' height
  // so the Contas line is ALWAYS visually lower than Leads Indicados!
  const minContasMaxToStayBelow = Math.ceil((leadsAxisMax * maxDayRatio) / 0.7);
  // Also give some comfortable headroom over maxContas
  const naturalContasMax = Math.ceil(maxContas * 2.2);

  const targetContasMax = Math.max(naturalContasMax, minContasMaxToStayBelow);
  // Round up to nearest multiple of 4 for clean 4-step grid ticks
  const contasAxisMax = Math.max(8, Math.ceil(targetContasMax / 4) * 4);

  return {
    leadsAxisMax,
    contasAxisMax,
    singleAxisMax
  };
};
