import { Office, BaseDataRow, DailyHourlyStore, PeriodFilter } from '../types';

export interface WhatsAppReportParams {
  offices: Office[];
  baseData: BaseDataRow[];
  dailyHourly: DailyHourlyStore;
  periodFilter: PeriodFilter;
  startDate: string;
  endDate: string;
}

export const generateWhatsAppReportText = ({
  offices,
  baseData,
  periodFilter,
  startDate,
  endDate
}: WhatsAppReportParams): string => {
  // Determine filter bounds
  const currentRows = baseData.filter(row => {
    return (!startDate || row.data >= startDate) && (!endDate || row.data <= endDate);
  });

  // Calculate previous period date range for variation comparison
  let prevStartDate = '';
  let prevEndDate = '';

  if (startDate && endDate) {
    const startObj = new Date(startDate + 'T12:00:00Z');
    const endObj = new Date(endDate + 'T12:00:00Z');
    const diffDays = Math.max(1, Math.round((endObj.getTime() - startObj.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const prevStartObj = new Date(startObj);
    prevStartObj.setDate(prevStartObj.getDate() - diffDays);

    const prevEndObj = new Date(startObj);
    prevEndObj.setDate(prevEndObj.getDate() - 1);

    prevStartDate = prevStartObj.toISOString().slice(0, 10);
    prevEndDate = prevEndObj.toISOString().slice(0, 10);
  }

  const previousRows = baseData.filter(row => {
    return (!prevStartDate || row.data >= prevStartDate) && (!prevEndDate || row.data <= prevEndDate);
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

  const formatVar = (pct: number): string => {
    const rounded = Math.round(pct);
    if (rounded >= 0) return `+${rounded}%`;
    return `${rounded}%`;
  };

  const reportLines: string[] = [];
  reportLines.push('Segue o report diário das operações:\n');

  let totalBoletosCurr = 0;
  let totalBoletosPrev = 0;
  let totalContasCurr = 0;
  let totalContasPrev = 0;

  offices.forEach(off => {
    const offName = off.name;
    const offCurRows = currentRows.filter(r => r.escritorio.toLowerCase() === offName.toLowerCase());
    const offPrevRows = previousRows.filter(r => r.escritorio.toLowerCase() === offName.toLowerCase());

    const boletosCurr = offCurRows.reduce((s, r) => s + r.boletos, 0);
    const boletosPrev = offPrevRows.reduce((s, r) => s + r.boletos, 0);
    const contasCurr = offCurRows.reduce((s, r) => s + r.contas, 0);
    const contasPrev = offPrevRows.reduce((s, r) => s + r.contas, 0);

    totalBoletosCurr += boletosCurr;
    totalBoletosPrev += boletosPrev;
    totalContasCurr += contasCurr;
    totalContasPrev += contasPrev;

    const varBoletosPct = boletosPrev > 0 ? ((boletosCurr - boletosPrev) / boletosPrev) * 100 : 0;
    
    // Month-to-Date (MTD) accumulated totals for realistic monthly projection
    const offMonthRows = monthRows.filter(r => r.escritorio.toLowerCase() === offName.toLowerCase());
    const mtdBoletos = offMonthRows.reduce((s, r) => s + r.boletos, 0);
    const mtdContas = offMonthRows.reduce((s, r) => s + r.contas, 0);

    // Calculate projected month-end total based on MTD pace (never less than MTD realized!)
    const projBoletos = mtdBoletos > 0 
      ? Math.max(mtdBoletos, Math.round((mtdBoletos / dayOfMonth) * totalDaysInMonth))
      : Math.round(boletosCurr * 20);

    const varContasPct = contasPrev > 0 ? ((contasCurr - contasPrev) / contasPrev) * 100 : 0;
    const projContas = mtdContas > 0
      ? Math.max(mtdContas, Math.round((mtdContas / dayOfMonth) * totalDaysInMonth))
      : Math.round(contasCurr * 20);

    reportLines.push(`📌 ${offName}\n`);
    reportLines.push(`* Boletos: ${formatNumber(boletosCurr)} | Projeção mensal: ${formatNumber(projBoletos)} | Variação: ${formatVar(varBoletosPct)}`);
    
    // RULE: If no contas abertas registered for the office on that day, omit the second line!
    if (contasCurr > 0) {
      reportLines.push(`* Contas abertas: ${formatNumber(contasCurr)} | Projeção mensal: ${formatNumber(projContas)} | Variação: ${formatVar(varContasPct)}`);
    }

    reportLines.push(''); // blank separator line
  });

  // Consolidado Block
  const totalVarBoletosPct = totalBoletosPrev > 0 ? ((totalBoletosCurr - totalBoletosPrev) / totalBoletosPrev) * 100 : 0;
  const totalMtdBoletos = offices.reduce((sum, off) => {
    return sum + monthRows.filter(r => r.escritorio.toLowerCase() === off.name.toLowerCase()).reduce((s, r) => s + r.boletos, 0);
  }, 0);

  const totalProjBoletos = totalMtdBoletos > 0
    ? Math.max(totalMtdBoletos, Math.round((totalMtdBoletos / dayOfMonth) * totalDaysInMonth))
    : Math.round(totalBoletosCurr * 20);

  const totalVarContasPct = totalContasPrev > 0 ? ((totalContasCurr - totalContasPrev) / totalContasPrev) * 100 : 0;
  const totalMtdContas = offices.reduce((sum, off) => {
    return sum + monthRows.filter(r => r.escritorio.toLowerCase() === off.name.toLowerCase()).reduce((s, r) => s + r.contas, 0);
  }, 0);

  const totalProjContas = totalMtdContas > 0
    ? Math.max(totalMtdContas, Math.round((totalMtdContas / dayOfMonth) * totalDaysInMonth))
    : Math.round(totalContasCurr * 20);

  reportLines.push('📊 Consolidado\n');
  reportLines.push(`* Boletos: ${formatNumber(totalBoletosCurr)} | Projeção mensal: ${formatNumber(totalProjBoletos)} | Variação: ${formatVar(totalVarBoletosPct)}`);
  
  if (totalContasCurr > 0) {
    reportLines.push(`* Contas abertas: ${formatNumber(totalContasCurr)} | Projeção mensal: ${formatNumber(totalProjContas)} | Variação: ${formatVar(totalVarContasPct)}`);
  }

  return reportLines.join('\n').trim();
};
