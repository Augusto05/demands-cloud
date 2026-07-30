import { 
  Office, 
  BaseDataRow, 
  DailyHourlyStore, 
  WeeklySummaryRow, 
  MonthlySummaryRow, 
  CalculatedHourlyMetrics,
  AIInsight 
} from '../types';
import { INITIAL_OFFICES, INITIAL_BASE_DATA, INITIAL_DAILY_HOURLY } from '../data/initialData';
import * as XLSX from 'xlsx';

import { saveStorageItem, getUserScopedLocalKey } from './syncService';

const STORAGE_KEYS = {
  OFFICES: 'demands_offices',
  BASE_DATA: 'demands_base_data',
  DAILY_HOURLY: 'demands_daily_hourly'
};

// LocalStorage & Server Sync helpers
export const getStoredOffices = (): Office[] => {
  const scopedKey = getUserScopedLocalKey(STORAGE_KEYS.OFFICES);
  const data = localStorage.getItem(scopedKey);
  if (data) {
    try { return JSON.parse(data); } catch (e) { console.error(e); }
  }
  return INITIAL_OFFICES;
};

export const saveStoredOffices = (offices: Office[]): void => {
  saveStorageItem('offices', STORAGE_KEYS.OFFICES, offices);
};

export const getStoredBaseData = (): BaseDataRow[] => {
  const scopedKey = getUserScopedLocalKey(STORAGE_KEYS.BASE_DATA);
  const data = localStorage.getItem(scopedKey);
  if (data) {
    try {
      const parsed: BaseDataRow[] = JSON.parse(data);
      return parsed.map(row => {
        let cleanContas = Math.round(row.contas || 0);
        if (row.contas > 0 && row.contas < 1 && row.boletos > 0) {
          cleanContas = Math.round(row.contas * row.boletos);
        }
        return {
          ...row,
          contas: cleanContas,
          conversao: row.boletos > 0 ? cleanContas / row.boletos : 0
        };
      });
    } catch (e) { console.error(e); }
  }
  return INITIAL_BASE_DATA;
};

export const saveStoredBaseData = (baseData: BaseDataRow[]): void => {
  saveStorageItem('base_data', STORAGE_KEYS.BASE_DATA, baseData);
};

export const getStoredDailyHourly = (): DailyHourlyStore => {
  const scopedKey = getUserScopedLocalKey(STORAGE_KEYS.DAILY_HOURLY);
  const data = localStorage.getItem(scopedKey);
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) { console.error(e); }
  }
  return INITIAL_DAILY_HOURLY;
};

export const saveStoredDailyHourly = (dailyHourly: DailyHourlyStore): void => {
  saveStorageItem('daily_hourly', STORAGE_KEYS.DAILY_HOURLY, dailyHourly);
};

export const resetDataToInitial = (): void => {
  localStorage.setItem(STORAGE_KEYS.OFFICES, JSON.stringify(INITIAL_OFFICES));
  localStorage.setItem(STORAGE_KEYS.BASE_DATA, JSON.stringify(INITIAL_BASE_DATA));
  localStorage.setItem(STORAGE_KEYS.DAILY_HOURLY, JSON.stringify(INITIAL_DAILY_HOURLY));
};

// ISO Week Number calculator
export const getISOWeekNumber = (date: Date): number => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

export const formatDateToYYYYMMDD = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getSheetKeyFromDateStr = (dateStr: string): string => {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}`;
  }
  return '21.07';
};

export const getDateStrFromSheetKey = (sheetKey: string, year: number = 2026): string => {
  const parts = sheetKey.split('.');
  if (parts.length === 2) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return '2026-07-21';
};

// Dynamic Merger of BaseData and DailyHourly Store
export const getEffectiveBaseData = (
  baseData: BaseDataRow[],
  dailyHourly: DailyHourlyStore,
  offices: Office[]
): BaseDataRow[] => {
  const effectiveMap = new Map<string, BaseDataRow>();

  // 1. Seed existing baseData rows
  baseData.forEach(row => {
    const key = `${row.data}_${row.escritorio.toLowerCase()}`;
    effectiveMap.set(key, row);
  });

  // 2. Compute dynamic daily totals from dailyHourly for all dates
  Object.entries(dailyHourly).forEach(([sheetKey, officeMap]) => {
    const dateStr = getDateStrFromSheetKey(sheetKey);
    const dateObj = new Date(dateStr + 'T12:00:00Z');
    const weekNum = getISOWeekNumber(dateObj);

    Object.entries(officeMap).forEach(([escName, dataObj]) => {
      const offObj = offices.find(o => o.name.toLowerCase() === escName.toLowerCase());
      const dailyMeta = offObj ? offObj.dailyMeta : 500;
      
      let sumBoletos = 0;
      if (dataObj.hourly) {
        Object.values(dataObj.hourly).forEach(val => {
          sumBoletos += (val || 0);
        });
      }

      const key = `${dateStr}_${escName.toLowerCase()}`;
      const existing = effectiveMap.get(key);

      let finalContas = 0;
      if (existing) {
        // If dataObj.contas is valid integer and NOT equal to total boletos (corrupted), use it, otherwise trust clean existing.contas
        if (
          dataObj.contas !== undefined && 
          dataObj.contas !== null && 
          Number.isInteger(dataObj.contas) && 
          dataObj.contas > 0 &&
          dataObj.contas < sumBoletos
        ) {
          finalContas = dataObj.contas;
        } else {
          finalContas = existing.contas;
        }
      } else {
        if (dataObj.contas && Number.isInteger(dataObj.contas) && dataObj.contas < sumBoletos) {
          finalContas = dataObj.contas;
        } else {
          finalContas = 0;
        }
      }

      const finalBoletos = sumBoletos > 0 ? sumBoletos : (existing ? existing.boletos : 0);

      if (sumBoletos > 0 || finalContas > 0 || !existing) {
        effectiveMap.set(key, {
          data: dateStr,
          escritorio: escName,
          aba: sheetKey,
          boletos: finalBoletos,
          meta_boletos: dailyMeta,
          contas: finalContas,
          conversao: finalBoletos > 0 ? finalContas / finalBoletos : 0,
          semana: weekNum,
          ano: dateObj.getFullYear(),
          mes: dateObj.getMonth() + 1
        });
      }
    });
  });

  return Array.from(effectiveMap.values()).sort((a, b) => b.data.localeCompare(a.data));
};

// Real-time calculation of Hourly & Daily Metrics
export const calculateOfficeMetrics = (
  hourlyRecord: Record<number, number>,
  contas: number,
  dailyMeta: number
): {
  totalBoletos: number;
  mediaHora: number;
  metaHora: number;
  gapHora: number;
  projDia: number;
  gapDia: number;
  projHoraAtual: number;
  gapProjHoraAtual: number;
  conversao: number;
  hourlyDetails: CalculatedHourlyMetrics[];
} => {
  const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17];
  let totalBoletos = 0;

  // Logged hours: hours where boletos > 0 or explicitly entered
  const loggedHoursList = hours.filter(h => hourlyRecord[h] !== undefined && hourlyRecord[h] !== null && hourlyRecord[h] > 0);

  hours.forEach(h => {
    totalBoletos += (hourlyRecord[h] || 0);
  });

  const loggedHoursCount = loggedHoursList.length > 0 ? loggedHoursList.length : (totalBoletos > 0 ? 1 : 0);

  const metaHora = dailyMeta / 9;
  const mediaHora = loggedHoursCount > 0 ? totalBoletos / loggedHoursCount : 0;
  const gapHora = mediaHora - metaHora;
  const projDia = loggedHoursCount > 0 ? mediaHora * 9 : 0;
  const gapDia = projDia - dailyMeta;
  const conversao = totalBoletos > 0 ? (contas / totalBoletos) : 0;

  // Projection for current hour based on minute of NOW()
  const now = new Date();
  const currentMinutes = now.getMinutes() > 0 ? now.getMinutes() : 60;
  const latestLoggedHour = loggedHoursList.length > 0 ? loggedHoursList[loggedHoursList.length - 1] : 9;
  const latestHourBoletos = hourlyRecord[latestLoggedHour] || 0;

  const projHoraAtual = latestHourBoletos > 0 
    ? Math.round((latestHourBoletos / currentMinutes) * 60) 
    : Math.round(mediaHora);
  const gapProjHoraAtual = projHoraAtual - metaHora;

  const hourlyDetails: CalculatedHourlyMetrics[] = hours.map(h => {
    const b = hourlyRecord[h] || 0;
    return {
      hour: h,
      boletos: b,
      mediaHora,
      metaHora,
      gapHora: b - metaHora,
      projDia,
      metaDia: dailyMeta,
      gapDia,
      contas,
      conversao
    };
  });

  return {
    totalBoletos,
    mediaHora,
    metaHora,
    gapHora,
    projDia,
    gapDia,
    projHoraAtual,
    gapProjHoraAtual,
    conversao,
    hourlyDetails
  };
};

// Weekly Summary calculation (Current Week vs Previous Week)
export const calculateWeeklySummary = (
  baseData: BaseDataRow[],
  offices: Office[],
  targetWeek?: number,
  targetYear?: number
): WeeklySummaryRow[] => {
  const now = new Date();
  const currentWeek = targetWeek ?? getISOWeekNumber(now);
  const currentYear = targetYear ?? now.getFullYear();
  const prevWeek = currentWeek === 1 ? 52 : currentWeek - 1;
  const prevYear = currentWeek === 1 ? currentYear - 1 : currentYear;

  const rows: WeeklySummaryRow[] = offices.map(off => {
    const curRows = baseData.filter(d => d.escritorio.toLowerCase() === off.name.toLowerCase() && d.semana === currentWeek && d.ano === currentYear);
    const prevRows = baseData.filter(d => d.escritorio.toLowerCase() === off.name.toLowerCase() && d.semana === prevWeek && d.ano === prevYear);

    const boletosAtual = curRows.reduce((sum, r) => sum + r.boletos, 0);
    const boletosAnterior = prevRows.reduce((sum, r) => sum + r.boletos, 0);
    const variacaoBoletosPct = boletosAnterior > 0 ? ((boletosAtual - boletosAnterior) / boletosAnterior) : 0;

    const contasAtual = curRows.reduce((sum, r) => sum + r.contas, 0);
    const contasAnterior = prevRows.reduce((sum, r) => sum + r.contas, 0);
    const variacaoContasPct = contasAnterior > 0 ? ((contasAtual - contasAnterior) / contasAnterior) : 0;

    const conversaoAtual = boletosAtual > 0 ? (contasAtual / boletosAtual) : 0;
    const conversaoAnterior = boletosAnterior > 0 ? (contasAnterior / boletosAnterior) : 0;
    const variacaoConversaoPP = conversaoAtual - conversaoAnterior;

    return {
      escritorio: off.name,
      boletosAtual,
      boletosAnterior,
      variacaoBoletosPct,
      contasAtual,
      contasAnterior,
      variacaoContasPct,
      conversaoAtual,
      conversaoAnterior,
      variacaoConversaoPP
    };
  });

  // Total Row
  const totalBoletosAtual = rows.reduce((s, r) => s + r.boletosAtual, 0);
  const totalBoletosAnterior = rows.reduce((s, r) => s + r.boletosAnterior, 0);
  const totalContasAtual = rows.reduce((s, r) => s + r.contasAtual, 0);
  const totalContasAnterior = rows.reduce((s, r) => s + r.contasAnterior, 0);

  const totalConversaoAtual = totalBoletosAtual > 0 ? totalContasAtual / totalBoletosAtual : 0;
  const totalConversaoAnterior = totalBoletosAnterior > 0 ? totalContasAnterior / totalBoletosAnterior : 0;

  rows.push({
    escritorio: 'TOTAL GERAL',
    boletosAtual: totalBoletosAtual,
    boletosAnterior: totalBoletosAnterior,
    variacaoBoletosPct: totalBoletosAnterior > 0 ? ((totalBoletosAtual - totalBoletosAnterior) / totalBoletosAnterior) : 0,
    contasAtual: totalContasAtual,
    contasAnterior: totalContasAnterior,
    variacaoContasPct: totalContasAnterior > 0 ? ((totalContasAtual - totalContasAnterior) / totalContasAnterior) : 0,
    conversaoAtual: totalConversaoAtual,
    conversaoAnterior: totalConversaoAnterior,
    variacaoConversaoPP: totalConversaoAtual - totalConversaoAnterior
  });

  return rows;
};

// Monthly Summary calculation (Current Month vs Previous Month Daily Averages)
export const calculateMonthlySummary = (
  baseData: BaseDataRow[],
  offices: Office[],
  targetMonth?: number,
  targetYear?: number
): MonthlySummaryRow[] => {
  const now = new Date();
  const currentMonth = targetMonth ?? (now.getMonth() + 1);
  const currentYear = targetYear ?? now.getFullYear();
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  const rows: MonthlySummaryRow[] = offices.map(off => {
    const curRows = baseData.filter(d => d.escritorio.toLowerCase() === off.name.toLowerCase() && d.mes === currentMonth && d.ano === currentYear);
    const prevRows = baseData.filter(d => d.escritorio.toLowerCase() === off.name.toLowerCase() && d.mes === prevMonth && d.ano === prevYear);

    const mediaBoletosAtual = curRows.length > 0 ? curRows.reduce((sum, r) => sum + r.boletos, 0) / curRows.length : 0;
    const mediaBoletosAnterior = prevRows.length > 0 ? prevRows.reduce((sum, r) => sum + r.boletos, 0) / prevRows.length : 0;
    const variacaoBoletosPct = mediaBoletosAnterior > 0 ? ((mediaBoletosAtual - mediaBoletosAnterior) / mediaBoletosAnterior) : 0;

    const mediaContasAtual = curRows.length > 0 ? curRows.reduce((sum, r) => sum + r.contas, 0) / curRows.length : 0;
    const mediaContasAnterior = prevRows.length > 0 ? prevRows.reduce((sum, r) => sum + r.contas, 0) / prevRows.length : 0;
    const variacaoContasPct = mediaContasAnterior > 0 ? ((mediaContasAtual - mediaContasAnterior) / mediaContasAnterior) : 0;

    const totalBoletosCur = curRows.reduce((sum, r) => sum + r.boletos, 0);
    const totalContasCur = curRows.reduce((sum, r) => sum + r.contas, 0);
    const conversaoMediaAtual = totalBoletosCur > 0 ? (totalContasCur / totalBoletosCur) : 0;

    const totalBoletosPrev = prevRows.reduce((sum, r) => sum + r.boletos, 0);
    const totalContasPrev = prevRows.reduce((sum, r) => sum + r.contas, 0);
    const conversaoMediaAnterior = totalBoletosPrev > 0 ? (totalContasPrev / totalBoletosPrev) : 0;

    return {
      escritorio: off.name,
      mediaBoletosAtual,
      mediaBoletosAnterior,
      variacaoBoletosPct,
      mediaContasAtual,
      mediaContasAnterior,
      variacaoContasPct,
      conversaoMediaAtual,
      conversaoMediaAnterior,
      variacaoConversaoPP: conversaoMediaAtual - conversaoMediaAnterior
    };
  });

  // Total Row
  const totalMediaBoletosAtual = rows.reduce((s, r) => s + r.mediaBoletosAtual, 0);
  const totalMediaBoletosAnterior = rows.reduce((s, r) => s + r.mediaBoletosAnterior, 0);
  const totalMediaContasAtual = rows.reduce((s, r) => s + r.mediaContasAtual, 0);
  const totalMediaContasAnterior = rows.reduce((s, r) => s + r.mediaContasAnterior, 0);

  const totalConversaoMediaAtual = rows.length > 0 ? rows.reduce((s, r) => s + r.conversaoMediaAtual, 0) / rows.length : 0;
  const totalConversaoMediaAnterior = rows.length > 0 ? rows.reduce((s, r) => s + r.conversaoMediaAnterior, 0) / rows.length : 0;

  rows.push({
    escritorio: 'TOTAL',
    mediaBoletosAtual: totalMediaBoletosAtual,
    mediaBoletosAnterior: totalMediaBoletosAnterior,
    variacaoBoletosPct: totalMediaBoletosAnterior > 0 ? ((totalMediaBoletosAtual - totalMediaBoletosAnterior) / totalMediaBoletosAnterior) : 0,
    mediaContasAtual: totalMediaContasAtual,
    mediaContasAnterior: totalMediaContasAnterior,
    variacaoContasPct: totalMediaContasAnterior > 0 ? ((totalMediaContasAtual - totalMediaContasAnterior) / totalMediaContasAnterior) : 0,
    conversaoMediaAtual: totalConversaoMediaAtual,
    conversaoMediaAnterior: totalConversaoMediaAnterior,
    variacaoConversaoPP: totalConversaoMediaAtual - totalConversaoMediaAnterior
  });

  return rows;
};

// AI Insights Generator
export const generateAIInsights = (
  baseData: BaseDataRow[],
  offices: Office[]
): AIInsight[] => {
  const insights: AIInsight[] = [];

  // Check top performing office by conversion
  const officeConversions = offices.map(off => {
    const rows = baseData.filter(d => d.escritorio.toLowerCase() === off.name.toLowerCase());
    const totalB = rows.reduce((sum, r) => sum + r.boletos, 0);
    const totalC = rows.reduce((sum, r) => sum + r.contas, 0);
    return {
      name: off.name,
      conv: totalB > 0 ? (totalC / totalB) : 0,
      totalB,
      totalC
    };
  }).sort((a, b) => b.conv - a.conv);

  if (officeConversions.length > 0 && officeConversions[0].conv > 0) {
    const top = officeConversions[0];
    insights.push({
      id: 'top-conversion',
      type: 'positive',
      title: `Maior Taxa de Conversão: ${top.name}`,
      description: `O escritório ${top.name} lidera a eficiência comercial com ${(top.conv * 100).toFixed(1)}% de conversão de boletos para contas abertas.`,
      actionableRecommendation: `Avalie compartilhar as práticas de abordagem da equipe de ${top.name} com os demais escritórios.`,
      office: top.name
    });
  }

  // Check offices below daily target
  offices.forEach(off => {
    const rows = baseData.filter(d => d.escritorio.toLowerCase() === off.name.toLowerCase());
    if (rows.length > 0) {
      const lastRow = rows[rows.length - 1];
      if (lastRow.boletos < off.dailyMeta) {
        const gap = off.dailyMeta - lastRow.boletos;
        insights.push({
          id: `target-gap-${off.id}`,
          type: 'warning',
          title: `Gap na Meta Diária (${off.name})`,
          description: `No último registro (${lastRow.data}), ${off.name} atingiu ${lastRow.boletos} boletos (Meta: ${off.dailyMeta}), com GAP de -${gap} boletos.`,
          actionableRecommendation: `Aumentar os esforços nas horas de pico (10h às 12h e 14h às 16h) para compensar o deficit.`,
          office: off.name
        });
      }
    }
  });

  // Check total boleto volume trend
  const totalBoletos = baseData.reduce((s, r) => s + r.boletos, 0);
  const totalContas = baseData.reduce((s, r) => s + r.contas, 0);
  const avgConv = totalBoletos > 0 ? (totalContas / totalBoletos) * 100 : 0;

  insights.push({
    id: 'global-volume',
    type: 'info',
    title: 'Volume Geral da Operação',
    description: `Foram processados ${totalBoletos.toLocaleString('pt-BR')} boletos e ${totalContas} contas abertas acumuladas no histórico da plataforma.`,
    actionableRecommendation: `A taxa média geral da operação está em ${avgConv.toFixed(2)}%. Manter o acompanhamento diário para otimizar os horários de maior conversão.`
  });

  return insights;
};

// Export BaseData to Excel File
export const exportBaseDataToExcel = (baseData: BaseDataRow[], offices: Office[]) => {
  const wsData = baseData.map(r => ({
    'Data': r.data,
    'Escritório': r.escritorio,
    'Aba': r.aba,
    'Boletos': r.boletos,
    'Meta Boletos/Dia': r.meta_boletos,
    'Contas Abertas': r.contas,
    'Taxa Conversão': `${(r.conversao * 100).toFixed(2)}%`,
    'Semana ISO': r.semana,
    'Ano': r.ano,
    'Mês': r.mes
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, 'Base_Dados');

  XLSX.writeFile(wb, `Demands_Base_Dados_${new Date().toISOString().slice(0,10)}.xlsx`);
};
