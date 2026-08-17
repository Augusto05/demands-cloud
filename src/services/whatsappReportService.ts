import { Office, BaseDataRow, DailyHourlyStore, PeriodFilter } from '../types';

export interface WhatsAppReportParams {
  offices: Office[];
  baseData: BaseDataRow[];
  dailyHourly?: DailyHourlyStore;
  periodFilter?: PeriodFilter;
  startDate?: string;
  endDate?: string;
}

export const generateWhatsAppReportText = ({
  offices,
  baseData,
  dailyHourly = {},
  startDate = '',
  endDate = ''
}: WhatsAppReportParams): string => {
  // Determine filter bounds
  const currentRows = baseData.filter(row => {
    return (!startDate || row.data >= startDate) && (!endDate || row.data <= endDate);
  });

  // Determine Month-to-Date (MTD) context for Projection Calculation
  const refDateStr = endDate || startDate || new Date().toISOString().slice(0, 10);
  const refDateObj = new Date(refDateStr + 'T12:00:00Z');
  const targetMonth = refDateObj.getMonth() + 1;
  const targetYear = refDateObj.getFullYear();
  
  // Total calendar days in reference month (e.g. 31 for July)
  const totalDaysInMonth = new Date(targetYear, targetMonth, 0).getDate();
  
  // Current day of month reached (e.g. 28)
  const dayOfMonth = Math.max(1, Math.min(refDateObj.getDate(), totalDaysInMonth));

  // Current month cumulative rows up to refDate
  const monthRows = baseData.filter(row => {
    return row.mes === targetMonth && row.ano === targetYear && row.data <= refDateStr;
  });

  const formatNumber = (num: number): string => {
    return Math.round(num).toLocaleString('pt-BR');
  };

  // Helper to get logged hours for an office on reference date
  const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17];
  const dParts = refDateStr.split('-');
  const sheetKey = dParts.length === 3 ? `${dParts[2]}.${dParts[1]}` : refDateStr;
  const storeForDate = dailyHourly[sheetKey] || dailyHourly[refDateStr] || {};

  let maxLoggedHours = 0;
  Object.values(storeForDate).forEach(rec => {
    if (rec && rec.hourly) {
      const logged = hours.filter(h => rec.hourly[h] !== undefined && rec.hourly[h] !== null && rec.hourly[h] > 0).length;
      if (logged > maxLoggedHours) maxLoggedHours = logged;
    }
  });

  const reportSections: string[] = [];
  reportSections.push('Segue o report diário das operações:');

  let totalBoletosCurr = 0;

  offices.forEach(off => {
    const offName = off.name;
    const offCurRows = currentRows.filter(r => r.escritorio.toLowerCase() === offName.toLowerCase());
    const boletosCurr = offCurRows.reduce((s, r) => s + r.boletos, 0);
    totalBoletosCurr += boletosCurr;

    // Logged hours from dailyHourly if available
    const normOfficeName = offName.trim().toLowerCase();
    const foundKey = Object.keys(storeForDate).find(k => k.trim().toLowerCase() === normOfficeName);
    const officeRec = foundKey ? storeForDate[foundKey] : null;

    let loggedHours = 0;
    if (officeRec && officeRec.hourly) {
      loggedHours = hours.filter(h => officeRec.hourly[h] !== undefined && officeRec.hourly[h] !== null && officeRec.hourly[h] > 0).length;
    }

    const activeHours = loggedHours > 0 ? loggedHours : 9;
    const mediaHora = boletosCurr > 0 ? Math.round(boletosCurr / activeHours) : 0;

    // Month-to-Date (MTD) accumulated totals for realistic monthly projection
    const offMonthRows = monthRows.filter(r => r.escritorio.toLowerCase() === offName.toLowerCase());
    const mtdBoletos = offMonthRows.reduce((s, r) => s + r.boletos, 0);

    const projBoletos = mtdBoletos > 0 
      ? Math.max(mtdBoletos, Math.round((mtdBoletos / dayOfMonth) * totalDaysInMonth))
      : Math.round(boletosCurr * 20);

    reportSections.push(`📌 ${offName}\n* Boletos: ${formatNumber(boletosCurr)} | Média: ${formatNumber(mediaHora)}/h | Projeção mensal: ${formatNumber(projBoletos)}`);
  });

  // Consolidado Block
  const totalMtdBoletos = offices.reduce((sum, off) => {
    return sum + monthRows.filter(r => r.escritorio.toLowerCase() === off.name.toLowerCase()).reduce((s, r) => s + r.boletos, 0);
  }, 0);

  const totalProjBoletos = totalMtdBoletos > 0
    ? Math.max(totalMtdBoletos, Math.round((totalMtdBoletos / dayOfMonth) * totalDaysInMonth))
    : Math.round(totalBoletosCurr * 20);

  const consolidatedActiveHours = maxLoggedHours > 0 ? maxLoggedHours : 9;
  const totalMediaHora = totalBoletosCurr > 0 ? Math.round(totalBoletosCurr / consolidatedActiveHours) : 0;

  reportSections.push(`📊 Consolidado\n* Boletos: ${formatNumber(totalBoletosCurr)} | Média: ${formatNumber(totalMediaHora)}/h | Projeção mensal: ${formatNumber(totalProjBoletos)}`);

  return reportSections.join('\n\n').trim();
};

