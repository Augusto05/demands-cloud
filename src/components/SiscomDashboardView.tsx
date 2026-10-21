import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Copy,
  Check,
  Save,
  Trash2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  Clock,
  Users,
  Mail,
  ArrowRightLeft,
  History,
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  LabelList
} from 'recharts';
import { SiscomDailyRecord, SiscomStore } from '../types';
import {
  getStoredSiscomStore,
  fetchSiscomStoreFromCloud,
  saveSiscomRecord,
  deleteSiscomRecord,
  calcMediaHora,
  calcConversaoPct,
  calcDeltaPct,
  computeSystemAverages,
  getLast7DaysChartSeries
} from '../services/siscomService';
import { formatDateToYYYYMMDD } from '../services/dataService';

type FilterMode = 'dia' | 'ontem' | '7dias' | 'mes' | 'custom';

export const SiscomDashboardView: React.FC = () => {
  const todayStr = useMemo(() => formatDateToYYYYMMDD(new Date()), []);

  // Store state synced with Supabase
  const [store, setStore] = useState<SiscomStore>(getStoredSiscomStore);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Selected Date for Daily Input / Editing
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Filter Mode for Dashboard Visualization
  const [filterMode, setFilterMode] = useState<FilterMode>('dia');
  const [customStartDate, setCustomStartDate] = useState<string>(todayStr);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  // Form Inputs for selectedDate
  const [horasRodadas, setHorasRodadas] = useState<string>('');
  const [totalTransferencias, setTotalTransferencias] = useState<string>('');
  const [leadsIndicados, setLeadsIndicados] = useState<string>('');
  const [contasAbertas, setContasAbertas] = useState<string>('');
  const [produtividadeMailing, setProdutividadeMailing] = useState<string>('');
  const [atritados, setAtritados] = useState<string>('');

  // UI & Chart Options
  const [isPrintMode, setIsPrintMode] = useState<boolean>(false);
  const [useDualAxis, setUseDualAxis] = useState<boolean>(false);
  const [showPointLabels, setShowPointLabels] = useState<boolean>(true);
  const [invertAtritadosColor, setInvertAtritadosColor] = useState<boolean>(true);
  const [copiedImage, setCopiedImage] = useState<boolean>(false);
  const [downloadingImage, setDownloadingImage] = useState<boolean>(false);

  const captureCardRef = useRef<HTMLDivElement>(null);

  // Sync with Supabase on mount & interval
  useEffect(() => {
    let mounted = true;
    const syncData = async () => {
      const cloudStore = await fetchSiscomStoreFromCloud();
      if (mounted && cloudStore) {
        setStore(cloudStore);
      }
    };
    syncData();
    const interval = setInterval(syncData, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Populate form inputs whenever selectedDate changes (or when store first loads for that date)
  useEffect(() => {
    const existing = store.records[selectedDate];
    if (existing) {
      setHorasRodadas(existing.horasRodadas > 0 ? String(existing.horasRodadas) : '');
      setTotalTransferencias(existing.totalTransferencias > 0 ? String(existing.totalTransferencias) : '');
      setLeadsIndicados(existing.leadsIndicados > 0 ? String(existing.leadsIndicados) : '');
      setContasAbertas(existing.contasAbertas > 0 ? String(existing.contasAbertas) : '');
      setProdutividadeMailing(
        existing.produtividadeMailing > 0 ? String(existing.produtividadeMailing) : ''
      );
      setAtritados(existing.atritados > 0 ? String(existing.atritados) : '');
    } else {
      setHorasRodadas('');
      setTotalTransferencias('');
      setLeadsIndicados('');
      setContasAbertas('');
      setProdutividadeMailing('');
      setAtritados('');
    }
  }, [selectedDate, store.records[selectedDate]?.updatedAt]);

  // Parse current live form numbers
  const numHoras = parseFloat(horasRodadas.replace(',', '.')) || 0;
  const numTransferencias = parseInt(totalTransferencias, 10) || 0;
  const numLeads = parseInt(leadsIndicados, 10) || 0;
  const numContas = parseInt(contasAbertas, 10) || 0;
  const numProdMailing = parseFloat(produtividadeMailing.replace(',', '.')) || 0;
  const numAtritados = parseFloat(atritados.replace(',', '.')) || 0;

  // Live preview record merges current form state onto selectedDate so the user sees instant updates
  const effectiveRecordsMap = useMemo(() => {
    const hasFormInput =
      numHoras > 0 ||
      numTransferencias > 0 ||
      numLeads > 0 ||
      numContas > 0 ||
      numProdMailing > 0 ||
      numAtritados > 0;

    const map = { ...store.records };
    if (hasFormInput || map[selectedDate]) {
      map[selectedDate] = {
        date: selectedDate,
        horasRodadas: numHoras,
        totalTransferencias: numTransferencias,
        leadsIndicados: numLeads,
        contasAbertas: numContas,
        produtividadeMailing: numProdMailing,
        atritados: numAtritados,
        updatedAt: map[selectedDate]?.updatedAt || new Date().toISOString()
      };
    }
    return map;
  }, [
    store.records,
    selectedDate,
    numHoras,
    numTransferencias,
    numLeads,
    numContas,
    numProdMailing,
    numAtritados
  ]);

  // Save handler
  const handleSaveRecord = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSyncing(true);
    try {
      const record: SiscomDailyRecord = {
        date: selectedDate,
        horasRodadas: numHoras,
        totalTransferencias: numTransferencias,
        leadsIndicados: numLeads,
        contasAbertas: numContas,
        produtividadeMailing: numProdMailing,
        atritados: numAtritados,
        updatedAt: new Date().toISOString()
      };
      const updated = await saveSiscomRecord(store, record);
      setStore(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } finally {
      setIsSyncing(false);
    }
  };

  // Delete handler
  const handleDeleteDate = async (dateToDelete: string) => {
    if (!window.confirm(`Deseja remover os dados lançados no dia ${formatBRDate(dateToDelete)}?`)) {
      return;
    }
    setIsSyncing(true);
    try {
      const updated = await deleteSiscomRecord(store, dateToDelete);
      setStore(updated);
      if (dateToDelete === selectedDate) {
        setHorasRodadas('');
        setTotalTransferencias('');
        setLeadsIndicados('');
        setContasAbertas('');
        setProdutividadeMailing('');
        setAtritados('');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Date navigation helpers
  const shiftSelectedDate = (daysDelta: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    dt.setDate(dt.getDate() + daysDelta);
    const nextDateStr = formatDateToYYYYMMDD(dt);
    setSelectedDate(nextDateStr);
    if (filterMode === 'dia' || filterMode === 'ontem') {
      setFilterMode('dia');
    }
  };

  const selectPresetFilter = (mode: FilterMode) => {
    setFilterMode(mode);
    const today = new Date();
    if (mode === 'dia') {
      // Uses selectedDate
    } else if (mode === 'ontem') {
      const yest = new Date(today);
      yest.setDate(yest.getDate() - 1);
      const yestStr = formatDateToYYYYMMDD(yest);
      setSelectedDate(yestStr);
    } else if (mode === '7dias') {
      const d7 = new Date(today);
      d7.setDate(d7.getDate() - 6);
      setCustomStartDate(formatDateToYYYYMMDD(d7));
      setCustomEndDate(todayStr);
    } else if (mode === 'mes') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setCustomStartDate(formatDateToYYYYMMDD(firstDay));
      setCustomEndDate(formatDateToYYYYMMDD(lastDay));
    }
  };

  // Determine active date range for Dashboard display
  const activeRange = useMemo(() => {
    if (filterMode === 'dia' || filterMode === 'ontem') {
      return { start: selectedDate, end: selectedDate, isSingleDay: true };
    }
    return {
      start: customStartDate,
      end: customEndDate,
      isSingleDay: customStartDate === customEndDate
    };
  }, [filterMode, selectedDate, customStartDate, customEndDate]);

  // System Historical Averages across all saved records
  const systemAverages = useMemo(() => {
    return computeSystemAverages(effectiveRecordsMap);
  }, [effectiveRecordsMap]);

  // Compute displayed metrics for activeRange
  const displayedMetrics = useMemo(() => {
    if (activeRange.isSingleDay) {
      const rec = effectiveRecordsMap[activeRange.start];
      const totalTransf = rec ? rec.totalTransferencias : 0;
      const horas = rec ? rec.horasRodadas : 0;
      const mediaH = calcMediaHora(totalTransf, horas);
      const leads = rec ? rec.leadsIndicados : 0;
      const contas = rec ? rec.contasAbertas : 0;
      const convPct = calcConversaoPct(contas, leads);
      const prodMailing = rec ? rec.produtividadeMailing : 0;
      const atrit = rec ? rec.atritados : 0;

      return {
        daysIncluded: rec ? 1 : 0,
        totalTransferencias: totalTransf,
        avgDailyTransferencias: totalTransf,
        mediaHora: mediaH,
        leadsIndicados: leads,
        avgDailyLeads: leads,
        contasAbertas: contas,
        avgDailyContas: contas,
        conversaoPct: convPct,
        produtividadeMailing: prodMailing,
        atritados: atrit
      };
    }

    // Period aggregation (Acumulado / Período)
    const matchingRecords = Object.values(effectiveRecordsMap).filter(
      r =>
        r.date >= activeRange.start &&
        r.date <= activeRange.end &&
        (r.totalTransferencias > 0 ||
          r.leadsIndicados > 0 ||
          r.contasAbertas > 0 ||
          r.produtividadeMailing > 0 ||
          r.atritados > 0)
    );

    const count = matchingRecords.length;
    if (count === 0) {
      return {
        daysIncluded: 0,
        totalTransferencias: 0,
        avgDailyTransferencias: 0,
        mediaHora: 0,
        leadsIndicados: 0,
        avgDailyLeads: 0,
        contasAbertas: 0,
        avgDailyContas: 0,
        conversaoPct: 0,
        produtividadeMailing: 0,
        atritados: 0
      };
    }

    const sumTransf = matchingRecords.reduce((s, r) => s + r.totalTransferencias, 0);
    const sumHoras = matchingRecords.reduce((s, r) => s + r.horasRodadas, 0);
    const sumLeads = matchingRecords.reduce((s, r) => s + r.leadsIndicados, 0);
    const sumContas = matchingRecords.reduce((s, r) => s + r.contasAbertas, 0);
    const sumProd = matchingRecords.reduce((s, r) => s + r.produtividadeMailing, 0);
    const sumAtrit = matchingRecords.reduce((s, r) => s + r.atritados, 0);

    // Media Hora in period: total transferencias / total horas (or avg of daily mediaHora)
    const daysWithHours = matchingRecords.filter(r => r.horasRodadas > 0);
    const periodMediaHora =
      sumHoras > 0
        ? sumTransf / sumHoras
        : daysWithHours.length > 0
        ? daysWithHours.reduce((s, r) => s + calcMediaHora(r.totalTransferencias, r.horasRodadas), 0) /
          daysWithHours.length
        : 0;

    return {
      daysIncluded: count,
      totalTransferencias: sumTransf,
      avgDailyTransferencias: sumTransf / count,
      mediaHora: periodMediaHora,
      leadsIndicados: sumLeads,
      avgDailyLeads: sumLeads / count,
      contasAbertas: sumContas,
      avgDailyContas: sumContas / count,
      conversaoPct: calcConversaoPct(sumContas, sumLeads),
      produtividadeMailing: sumProd / count,
      atritados: sumAtrit / count
    };
  }, [activeRange, effectiveRecordsMap]);

  // Deltas (% above or below system average)
  // When viewing a period, we compare the period's daily average against the system historical daily average
  const deltas = useMemo(() => {
    return {
      transferencias: calcDeltaPct(
        displayedMetrics.avgDailyTransferencias,
        systemAverages.avgTotalTransferencias
      ),
      mediaHora: calcDeltaPct(displayedMetrics.mediaHora, systemAverages.avgMediaHora),
      leadsIndicados: calcDeltaPct(
        displayedMetrics.avgDailyLeads,
        systemAverages.avgLeadsIndicados
      ),
      contasAbertas: calcDeltaPct(
        displayedMetrics.avgDailyContas,
        systemAverages.avgContasAbertas
      ),
      conversaoPct: calcDeltaPct(displayedMetrics.conversaoPct, systemAverages.avgConversaoPct),
      produtividadeMailing: calcDeltaPct(
        displayedMetrics.produtividadeMailing,
        systemAverages.avgProdutividadeMailing
      ),
      atritados: calcDeltaPct(displayedMetrics.atritados, systemAverages.avgAtritados)
    };
  }, [displayedMetrics, systemAverages]);

  // 7-Day Comparative Chart Series ending at activeRange.end
  const chart7DaysSeries = useMemo(() => {
    return getLast7DaysChartSeries(effectiveRecordsMap, activeRange.end);
  }, [effectiveRecordsMap, activeRange.end]);

  // Sorted list of stored dates for quick history access
  const historyList = useMemo(() => {
    return Object.values(store.records)
      .filter(
        r =>
          r.totalTransferencias > 0 ||
          r.leadsIndicados > 0 ||
          r.contasAbertas > 0 ||
          r.produtividadeMailing > 0 ||
          r.atritados > 0
      )
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [store.records]);

  // Render High-Resolution PNG Canvas directly from data (pixel-perfect for WhatsApp)
  const generateDashboardCanvas = (): HTMLCanvasElement => {
    const scale = 2; // Retina 2x resolution
    const width = 880;
    const height = 620;
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);

    // Helper for rounded rects
    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    };

    // Background
    ctx.fillStyle = '#0B0B0E';
    ctx.fillRect(0, 0, width, height);

    // Outer Card Border
    roundRect(16, 16, width - 32, height - 32, 20);
    ctx.fillStyle = '#111115';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#25252D';
    ctx.stroke();

    // Header Bar
    ctx.fillStyle = '#FACC15';
    roundRect(36, 36, 6, 34, 3);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 20px Inter, system-ui, sans-serif';
    ctx.fillText('DASHBOARD SISCOM', 52, 53);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 11px Inter, system-ui, sans-serif';
    ctx.fillText('RESULTADO OPERACIONAL & DESEMPENHO DIÁRIO', 52, 69);

    // Date Badge on Right
    const periodLabel = activeRange.isSingleDay
      ? `DATA: ${formatBRDate(activeRange.start)}`
      : `PERÍODO: ${formatBRDate(activeRange.start)} A ${formatBRDate(activeRange.end)}`;
    ctx.font = '800 12px Inter, system-ui, sans-serif';
    const badgeW = ctx.measureText(periodLabel).width + 28;
    roundRect(width - 36 - badgeW, 38, badgeW, 30, 10);
    ctx.fillStyle = '#1A1A22';
    ctx.fill();
    ctx.strokeStyle = '#FACC1566';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#FACC15';
    ctx.fillText(periodLabel, width - 36 - badgeW + 14, 57);

    // Helper to draw Delta Badge next to value
    const drawDelta = (
      x: number,
      y: number,
      delta: number | null,
      invertColor = false
    ) => {
      if (delta === null || isNaN(delta)) return;
      const isZero = Math.abs(delta) < 0.05;
      const isUp = delta > 0;
      const isGood = invertColor ? !isUp : isUp;

      const arrow = isZero ? '•' : isUp ? '↑' : '↓';
      const txt = `${arrow} ${Math.abs(delta).toFixed(1).replace('.', ',')}%`;

      ctx.font = '800 11px Inter, system-ui, sans-serif';
      const tw = ctx.measureText(txt).width + 12;
      roundRect(x, y - 13, tw, 18, 6);
      ctx.fillStyle = isZero
        ? 'rgba(148,163,184,0.12)'
        : isGood
        ? 'rgba(16,185,129,0.14)'
        : 'rgba(244,63,94,0.14)';
      ctx.fill();

      ctx.fillStyle = isZero ? '#94A3B8' : isGood ? '#34D399' : '#FB7185';
      ctx.fillText(txt, x + 6, y);
    };

    // 3 Section Blocks (TRANSFERÊNCIAS | PRODUÇÃO | MAILING)
    const topY = 86;
    const boxH = 152;
    const gap = 14;
    const totalInnerW = width - 72;
    const col1W = Math.floor(totalInnerW * 0.30);
    const col2W = Math.floor(totalInnerW * 0.40);
    const col3W = totalInnerW - col1W - col2W - gap * 2;

    const col1X = 36;
    const col2X = col1X + col1W + gap;
    const col3X = col2X + col2W + gap;

    // --- BLOCK 1: TRANSFERÊNCIAS ---
    roundRect(col1X, topY, col1W, boxH, 14);
    ctx.fillStyle = '#16161C';
    ctx.fill();
    ctx.strokeStyle = '#262630';
    ctx.stroke();

    ctx.fillStyle = '#38BDF8';
    ctx.font = '800 11px Inter, system-ui, sans-serif';
    ctx.fillText('TRANSFERÊNCIAS', col1X + 16, topY + 24);

    // Metric 1.1: Total do dia
    const m1Y = topY + 52;
    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 11px Inter, system-ui, sans-serif';
    ctx.fillText(activeRange.isSingleDay ? 'Total do Dia' : 'Total do Período', col1X + 16, m1Y);

    const valTransfStr = displayedMetrics.totalTransferencias.toLocaleString('pt-BR');
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 24px Inter, system-ui, sans-serif';
    ctx.fillText(valTransfStr, col1X + 16, m1Y + 26);
    const wTransf = ctx.measureText(valTransfStr).width;
    drawDelta(col1X + 16 + wTransf + 8, m1Y + 22, deltas.transferencias);

    // Metric 1.2: Média Hora
    const m2Y = topY + 52;
    const col1MidX = col1X + Math.floor(col1W * 0.54);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 11px Inter, system-ui, sans-serif';
    ctx.fillText('Média / Hora', col1MidX, m2Y);

    const valMediaHStr = displayedMetrics.mediaHora.toFixed(1).replace('.', ',');
    ctx.fillStyle = '#38BDF8';
    ctx.font = '900 24px Inter, system-ui, sans-serif';
    ctx.fillText(valMediaHStr, col1MidX, m2Y + 26);
    const wMediaH = ctx.measureText(valMediaHStr).width;
    drawDelta(col1MidX + wMediaH + 6, m2Y + 22, deltas.mediaHora);

    // System average footer
    ctx.fillStyle = '#64748B';
    ctx.font = '500 10px Inter, system-ui, sans-serif';
    ctx.fillText(
      `Média sist.: ${Math.round(systemAverages.avgTotalTransferencias).toLocaleString('pt-BR')}/dia • ${systemAverages.avgMediaHora.toFixed(1).replace('.', ',')}/h`,
      col1X + 16,
      topY + boxH - 16
    );

    // --- BLOCK 2: PRODUÇÃO ---
    roundRect(col2X, topY, col2W, boxH, 14);
    ctx.fillStyle = '#16161C';
    ctx.fill();
    ctx.strokeStyle = '#262630';
    ctx.stroke();

    ctx.fillStyle = '#FACC15';
    ctx.font = '800 11px Inter, system-ui, sans-serif';
    ctx.fillText('PRODUÇÃO', col2X + 16, topY + 24);

    const pSubW = Math.floor((col2W - 32) / 3);
    // 2.1 Leads Indicados
    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 11px Inter, system-ui, sans-serif';
    ctx.fillText('Leads Indicados', col2X + 16, m1Y);

    const valLeadsStr = displayedMetrics.leadsIndicados.toLocaleString('pt-BR');
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 22px Inter, system-ui, sans-serif';
    ctx.fillText(valLeadsStr, col2X + 16, m1Y + 25);
    drawDelta(col2X + 16, m1Y + 46, deltas.leadsIndicados);

    // 2.2 Contas Abertas
    const p2X = col2X + 16 + pSubW;
    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 11px Inter, system-ui, sans-serif';
    ctx.fillText('Contas Abertas', p2X, m1Y);

    const valContasStr = displayedMetrics.contasAbertas.toLocaleString('pt-BR');
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 22px Inter, system-ui, sans-serif';
    ctx.fillText(valContasStr, p2X, m1Y + 25);
    drawDelta(p2X, m1Y + 46, deltas.contasAbertas);

    // 2.3 % Conversão
    const p3X = col2X + 16 + pSubW * 2;
    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 11px Inter, system-ui, sans-serif';
    ctx.fillText('% Conversão', p3X, m1Y);

    const valConvStr = `${displayedMetrics.conversaoPct.toFixed(1).replace('.', ',')}%`;
    ctx.fillStyle = '#4ADE80';
    ctx.font = '900 22px Inter, system-ui, sans-serif';
    ctx.fillText(valConvStr, p3X, m1Y + 25);
    drawDelta(p3X, m1Y + 46, deltas.conversaoPct);

    ctx.fillStyle = '#64748B';
    ctx.font = '500 10px Inter, system-ui, sans-serif';
    ctx.fillText(
      `Média sist.: Leads ${Math.round(systemAverages.avgLeadsIndicados)} • Contas ${Math.round(systemAverages.avgContasAbertas)} • Conv. ${systemAverages.avgConversaoPct.toFixed(1).replace('.', ',')}%`,
      col2X + 16,
      topY + boxH - 16
    );

    // --- BLOCK 3: MAILING ---
    roundRect(col3X, topY, col3W, boxH, 14);
    ctx.fillStyle = '#16161C';
    ctx.fill();
    ctx.strokeStyle = '#262630';
    ctx.stroke();

    ctx.fillStyle = '#A855F7';
    ctx.font = '800 11px Inter, system-ui, sans-serif';
    ctx.fillText('MAILING', col3X + 16, topY + 24);

    // 3.1 % Produtividade
    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 11px Inter, system-ui, sans-serif';
    ctx.fillText('% Produtividade', col3X + 16, m1Y);

    const valProdStr = `${displayedMetrics.produtividadeMailing.toFixed(1).replace('.', ',')}%`;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 22px Inter, system-ui, sans-serif';
    ctx.fillText(valProdStr, col3X + 16, m1Y + 25);
    drawDelta(col3X + 16, m1Y + 46, deltas.produtividadeMailing);

    // 3.2 % Atritados
    const m3MidX = col3X + Math.floor(col3W * 0.54);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 11px Inter, system-ui, sans-serif';
    ctx.fillText('% Atritados', m3MidX, m1Y);

    const valAtritStr = `${displayedMetrics.atritados.toFixed(1).replace('.', ',')}%`;
    ctx.fillStyle = '#FB923C';
    ctx.font = '900 22px Inter, system-ui, sans-serif';
    ctx.fillText(valAtritStr, m3MidX, m1Y + 25);
    drawDelta(m3MidX, m1Y + 46, deltas.atritados, invertAtritadosColor);

    ctx.fillStyle = '#64748B';
    ctx.font = '500 10px Inter, system-ui, sans-serif';
    ctx.fillText(
      `Média sist.: Prod. ${systemAverages.avgProdutividadeMailing.toFixed(1).replace('.', ',')}% • Atrit. ${systemAverages.avgAtritados.toFixed(1).replace('.', ',')}%`,
      col3X + 16,
      topY + boxH - 16
    );

    // --- CHART BOX (LAST 7 DAYS: LEADS INDICADOS VS CONTAS ABERTAS) ---
    const chartBoxY = topY + boxH + 16;
    const chartBoxH = height - chartBoxY - 36;
    roundRect(36, chartBoxY, totalInnerW, chartBoxH, 14);
    ctx.fillStyle = '#16161C';
    ctx.fill();
    ctx.strokeStyle = '#262630';
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 13px Inter, system-ui, sans-serif';
    ctx.fillText(
      'COMPARATIVO ÚLTIMOS 7 DIAS — LEADS INDICADOS vs CONTAS ABERTAS',
      54,
      chartBoxY + 26
    );

    // Plot Area
    const plotLeft = 86;
    const plotRight = width - 68;
    const plotTop = chartBoxY + 52;
    const plotBottom = chartBoxY + chartBoxH - 52;
    const plotW = plotRight - plotLeft;
    const plotH = plotBottom - plotTop;

    const maxLeads = Math.max(10, ...chart7DaysSeries.map(d => d.leadsIndicados));
    const maxContas = Math.max(5, ...chart7DaysSeries.map(d => d.contasAbertas));
    const globalMax = Math.ceil(Math.max(maxLeads, maxContas) * 1.15);

    // Draw 4 horizontal gridlines
    ctx.strokeStyle = '#262632';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = plotBottom - (plotH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(plotLeft, y);
      ctx.lineTo(plotRight, y);
      ctx.stroke();

      const labelVal = Math.round(((useDualAxis ? maxLeads : globalMax) * i) / 4);
      ctx.fillStyle = '#64748B';
      ctx.font = '600 10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(String(labelVal), plotLeft - 10, y + 3);
    }
    ctx.textAlign = 'left';

    const stepX = plotW / Math.max(1, chart7DaysSeries.length - 1);

    // Vertical reference line on last day (current day)
    const lastX = plotLeft + stepX * (chart7DaysSeries.length - 1);
    ctx.strokeStyle = '#334155';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(lastX, plotTop);
    ctx.lineTo(lastX, plotBottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // Compute coordinates
    const leadsPts = chart7DaysSeries.map((pt, idx) => {
      const x = plotLeft + idx * stepX;
      const denom = useDualAxis ? Math.ceil(maxLeads * 1.15) : globalMax;
      const y = plotBottom - (pt.leadsIndicados / Math.max(1, denom)) * plotH;
      return { x, y, val: pt.leadsIndicados, label: pt.shortLabel };
    });

    const contasPts = chart7DaysSeries.map((pt, idx) => {
      const x = plotLeft + idx * stepX;
      const denom = useDualAxis ? Math.ceil(maxContas * 1.15) : globalMax;
      const y = plotBottom - (pt.contasAbertas / Math.max(1, denom)) * plotH;
      return { x, y, val: pt.contasAbertas, label: pt.shortLabel };
    });

    // X-Axis Labels
    leadsPts.forEach(p => {
      ctx.fillStyle = '#94A3B8';
      ctx.font = '700 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, p.x, plotBottom + 18);
    });

    // Draw Line 1: Leads Indicados (#84CC16 - Lime Green like reference image)
    ctx.strokeStyle = '#84CC16';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    leadsPts.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // Draw Line 2: Contas Abertas (#38BDF8 - Cyan/White contrast)
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    contasPts.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // Dots & Labels for Leads
    leadsPts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#84CC16';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#111115';
      ctx.stroke();

      if (showPointLabels) {
        ctx.fillStyle = '#A3E635';
        ctx.font = '800 10px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(p.val), p.x, p.y - 9);
      }
    });

    // Dots & Labels for Contas
    contasPts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#38BDF8';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#111115';
      ctx.stroke();

      if (showPointLabels) {
        ctx.fillStyle = '#7DD3FC';
        ctx.font = '800 10px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(p.val), p.x, p.y + 15);
      }
    });

    // Bottom Legend
    ctx.textAlign = 'left';
    const legY = chartBoxY + chartBoxH - 14;
    // Legend 1
    ctx.fillStyle = '#84CC16';
    ctx.beginPath();
    ctx.arc(width / 2 - 140, legY - 4, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '700 11px Inter, system-ui, sans-serif';
    ctx.fillText('Leads Indicados', width / 2 - 130, legY);

    // Legend 2
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.arc(width / 2 + 10, legY - 4, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '700 11px Inter, system-ui, sans-serif';
    ctx.fillText('Contas Abertas', width / 2 + 20, legY);

    return canvas;
  };

  const handleDownloadPNG = () => {
    setDownloadingImage(true);
    try {
      const canvas = generateDashboardCanvas();
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `dashboard-siscom-${activeRange.start}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setTimeout(() => setDownloadingImage(false), 600);
    }
  };

  const handleCopyImageToClipboard = async () => {
    try {
      const canvas = generateDashboardCanvas();
      canvas.toBlob(async blob => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob
            })
          ]);
          setCopiedImage(true);
          setTimeout(() => setCopiedImage(false), 2500);
        } catch (err) {
          // Fallback: download if clipboard image API is restricted
          handleDownloadPNG();
        }
      }, 'image/png');
    } catch (e) {
      handleDownloadPNG();
    }
  };

  // Live calculated values for the form preview
  const formMediaHora = calcMediaHora(numTransferencias, numHoras);
  const formConversaoPct = calcConversaoPct(numContas, numLeads);

  return (
    <div className="space-y-5">
      {/* Top Action & Period Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#101010] border border-[#222222] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shadow-xl">
        {/* Left: Module Title & Quick Filter Presets */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2.5 mr-2">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-[#FACC15] shadow-md">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-black text-white tracking-wide leading-tight">
                Dashboard Siscom
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                Fechamento diário compacto & comparativo de 7 dias
              </p>
            </div>
          </div>

          {/* Period Preset Pills */}
          <div className="flex items-center bg-[#161616] p-1 rounded-xl border border-[#242424]">
            {[
              { id: 'dia', label: 'Dia Selecionado' },
              { id: 'ontem', label: 'Ontem' },
              { id: '7dias', label: 'Acumulado 7D' },
              { id: 'mes', label: 'Mês Atual' },
              { id: 'custom', label: 'Período' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => selectPresetFilter(tab.id as FilterMode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterMode === tab.id
                    ? 'bg-[#FACC15] text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Pickers when in Period Mode */}
          {(filterMode === '7dias' || filterMode === 'mes' || filterMode === 'custom') && (
            <div className="flex items-center gap-2 bg-[#161616] px-3 py-1.5 rounded-xl border border-[#262626] text-xs">
              <span className="text-slate-400 font-semibold">De:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={e => {
                  setCustomStartDate(e.target.value);
                  setFilterMode('custom');
                }}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              />
              <span className="text-slate-500">—</span>
              <span className="text-slate-400 font-semibold">Até:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => {
                  setCustomEndDate(e.target.value);
                  setFilterMode('custom');
                }}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Right: Export & Print Mode Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsPrintMode(!isPrintMode)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              isPrintMode
                ? 'bg-amber-500/20 text-[#FACC15] border-amber-500/40'
                : 'bg-[#161616] text-slate-300 border-[#262626] hover:text-white hover:bg-[#1E1E1E]'
            }`}
            title="Ocultar painel lateral para tirar print limpo da tela"
          >
            {isPrintMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isPrintMode ? 'Sair do Modo Print' : 'Modo Print Limpo'}</span>
          </button>

          <button
            onClick={handleCopyImageToClipboard}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition-all flex items-center gap-1.5 cursor-pointer ${
              copiedImage
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-[#18181F] text-slate-200 border-[#2C2C38] hover:border-slate-500 hover:text-white'
            }`}
            title="Copia a imagem pronta para colar (Ctrl+V) direto no grupo do WhatsApp"
          >
            {copiedImage ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedImage ? 'Imagem Copiada!' : 'Copiar Imagem'}</span>
          </button>

          <button
            onClick={handleDownloadPNG}
            disabled={downloadingImage}
            className="px-4 py-2 rounded-xl bg-[#FACC15] hover:bg-amber-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-amber-950/30 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar PNG</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout: Left Input Panel + Right Compact Dashboard Card */}
      <div className={`grid grid-cols-1 ${isPrintMode ? 'lg:grid-cols-1 max-w-4xl mx-auto' : ' xl:grid-cols-12'} gap-6 items-start`}>
        {/* LEFT COLUMN: Daily Data Entry & Past Days Selector (Hidden in Print Mode) */}
        {!isPrintMode && (
          <div className="xl:col-span-5 space-y-4">
            <form
              onSubmit={handleSaveRecord}
              className="p-5 rounded-2xl bg-[#101010] border border-[#222222] space-y-5 shadow-xl"
            >
              {/* Date Selector Header for Inserting or Updating Past Days */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#1E1E1E]">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FACC15] block">
                    LANÇAMENTO / EDIÇÃO DIÁRIA
                  </span>
                  <h2 className="text-sm font-bold text-white">
                    {selectedDate === todayStr
                      ? `Hoje (${formatBRDate(selectedDate)})`
                      : `Dia ${formatBRDate(selectedDate)}`}
                  </h2>
                </div>

                {/* Date Navigation Controls */}
                <div className="flex items-center gap-1.5 bg-[#161616] p-1 rounded-xl border border-[#262626]">
                  <button
                    type="button"
                    onClick={() => shiftSelectedDate(-1)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#222222] transition-colors cursor-pointer"
                    title="Dia anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <input
                    type="date"
                    value={selectedDate}
                    onChange={e => {
                      if (e.target.value) {
                        setSelectedDate(e.target.value);
                        setFilterMode('dia');
                      }
                    }}
                    className="bg-transparent text-xs font-extrabold text-white px-1.5 py-1 focus:outline-none cursor-pointer"
                  />

                  <button
                    type="button"
                    onClick={() => shiftSelectedDate(1)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#222222] transition-colors cursor-pointer"
                    title="Dia seguinte"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {selectedDate !== todayStr && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDate(todayStr);
                        setFilterMode('dia');
                      }}
                      className="px-2 py-1 rounded-lg bg-amber-500/15 text-[#FACC15] text-[10px] font-extrabold hover:bg-amber-500/25 transition-colors cursor-pointer"
                    >
                      Hoje
                    </button>
                  )}
                </div>
              </div>

              {/* SECTION 1: TRANSFERÊNCIAS */}
              <div className="p-3.5 rounded-xl bg-[#151519] border border-[#23232B] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-sky-400" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-sky-400">
                      1. Transferências
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">
                    Média/Hora calc.:{' '}
                    <strong className="text-sky-400">
                      {formMediaHora.toFixed(1).replace('.', ',')}/h
                    </strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Horas rodadas no dia{' '}
                      <span className="text-[10px] text-slate-500">(oculto no print)</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="Ex: 8.5"
                      value={horasRodadas}
                      onChange={e => setHorasRodadas(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0D0D10] border border-[#2A2A35] text-sm font-bold text-white focus:outline-none focus:border-sky-400 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Total do dia
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Ex: 420"
                      value={totalTransferencias}
                      onChange={e => setTotalTransferencias(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0D0D10] border border-[#2A2A35] text-sm font-bold text-white focus:outline-none focus:border-sky-400 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: PRODUÇÃO */}
              <div className="p-3.5 rounded-xl bg-[#151519] border border-[#23232B] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#FACC15]" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#FACC15]">
                      2. Produção
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">
                    % Conversão calc.:{' '}
                    <strong className="text-emerald-400">
                      {formConversaoPct.toFixed(2).replace('.', ',')}%
                    </strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Leads Indicados
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Ex: 180"
                      value={leadsIndicados}
                      onChange={e => setLeadsIndicados(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0D0D10] border border-[#2A2A35] text-sm font-bold text-white focus:outline-none focus:border-[#FACC15] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      Contas Abertas
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Ex: 45"
                      value={contasAbertas}
                      onChange={e => setContasAbertas(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0D0D10] border border-[#2A2A35] text-sm font-bold text-white focus:outline-none focus:border-[#FACC15] transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: MAILING */}
              <div className="p-3.5 rounded-xl bg-[#151519] border border-[#23232B] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-purple-400">
                      3. Mailing
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInvertAtritadosColor(!invertAtritadosColor)}
                    className="text-[10px] font-semibold text-slate-400 hover:text-slate-200 underline cursor-pointer"
                    title="Alternar se queda em % Atritados é destacada como positiva (verde)"
                  >
                    Atritados: {invertAtritadosColor ? 'Menor = Verde' : 'Maior = Verde'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      % Produtividade do Mailing
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ex: 38.5"
                      value={produtividadeMailing}
                      onChange={e => setProdutividadeMailing(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0D0D10] border border-[#2A2A35] text-sm font-bold text-white focus:outline-none focus:border-purple-400 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                      % Atritados
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ex: 6.4"
                      value={atritados}
                      onChange={e => setAtritados(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0D0D10] border border-[#2A2A35] text-sm font-bold text-white focus:outline-none focus:border-purple-400 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Submit / Delete Action Row */}
              <div className="flex items-center justify-between gap-3 pt-1">
                {store.records[selectedDate] ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteDate(selectedDate)}
                    className="px-3 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Limpar Dia</span>
                  </button>
                ) : (
                  <div />
                )}

                <button
                  type="submit"
                  disabled={isSyncing}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                    saveSuccess
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-[#FACC15] hover:bg-amber-400 text-slate-950'
                  }`}
                >
                  {saveSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Salvo e Sincronizado!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>
                        {store.records[selectedDate]
                          ? `Atualizar Dados (${formatBRDate(selectedDate)})`
                          : `Salvar Dados (${formatBRDate(selectedDate)})`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Quick Access History of Previous Days */}
            <div className="p-4 rounded-2xl bg-[#101010] border border-[#222222] space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-400" />
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                    Dias Anteriores Lançados ({historyList.length})
                  </h3>
                </div>
                <span className="text-[10px] text-slate-500 font-medium">
                  Clique em um dia para editar
                </span>
              </div>

              {historyList.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center">
                  Nenhum dia salvo ainda. Insira os dados acima e clique em Salvar.
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {historyList.map(item => {
                    const isSelected = item.date === selectedDate;
                    const itemConv = calcConversaoPct(item.contasAbertas, item.leadsIndicados);
                    const itemMediaH = calcMediaHora(item.totalTransferencias, item.horasRodadas);
                    return (
                      <div
                        key={item.date}
                        onClick={() => {
                          setSelectedDate(item.date);
                          setFilterMode('dia');
                        }}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/50 text-white'
                            : 'bg-[#151519] border-[#22222A] text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-md font-extrabold text-[11px] ${
                              isSelected
                                ? 'bg-[#FACC15] text-slate-950'
                                : 'bg-[#22222A] text-slate-300'
                            }`}
                          >
                            {formatBRDate(item.date)}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Transf: <strong className="text-white">{item.totalTransferencias}</strong>{' '}
                            ({itemMediaH.toFixed(1)}/h)
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="text-slate-400">
                            Leads: <strong className="text-lime-400">{item.leadsIndicados}</strong>
                          </span>
                          <span className="text-slate-400">
                            Contas: <strong className="text-sky-400">{item.contasAbertas}</strong>
                          </span>
                          <span className="text-emerald-400 font-bold">
                            {itemConv.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* RIGHT COLUMN: Compact Visual Dashboard Card (Screenshot / Share Ready) */}
        <div className={`${isPrintMode ? 'col-span-1' : 'xl:col-span-7'} space-y-3`}>
          {/* THE CAPTURE CARD */}
          <div
            ref={captureCardRef}
            className="p-5 sm:p-6 rounded-3xl bg-[#111115] border border-[#25252E] shadow-2xl space-y-5 relative overflow-hidden"
          >
            {/* Subtle top accent glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Card Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#22222A] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-9 rounded-full bg-[#FACC15]" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                      DASHBOARD SISCOM
                    </h2>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-500/15 text-[#FACC15] border border-amber-500/30">
                      {activeRange.isSingleDay ? 'Fechamento Diário' : 'Acumulado Período'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Comparativo automático vs. média histórica ({systemAverages.daysCount}{' '}
                    {systemAverages.daysCount === 1 ? 'dia registrado' : 'dias registrados'})
                  </p>
                </div>
              </div>

              {/* Date / Period Badge */}
              <div className="px-3.5 py-2 rounded-xl bg-[#181820] border border-[#FACC15]/40 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#FACC15]" />
                <span className="text-xs font-black text-[#FACC15] tracking-wide">
                  {activeRange.isSingleDay
                    ? formatBRDate(activeRange.start)
                    : `${formatBRDate(activeRange.start)} a ${formatBRDate(activeRange.end)}`}
                </span>
              </div>
            </div>

            {/* 3 Compact KPI Blocks: TRANSFERÊNCIAS | PRODUÇÃO | MAILING */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
              {/* 1. TRANSFERÊNCIAS (4 cols) */}
              <div className="md:col-span-4 p-4 rounded-2xl bg-[#16161D] border border-[#262632] flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    Transferências
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  {/* Total do Dia */}
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold block">
                      {activeRange.isSingleDay ? 'Total do Dia' : 'Total Período'}
                    </span>
                    <div className="flex items-baseline gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-2xl font-black text-white tracking-tight">
                        {displayedMetrics.totalTransferencias.toLocaleString('pt-BR')}
                      </span>
                      <MinimalDeltaBadge delta={deltas.transferencias} />
                    </div>
                  </div>

                  {/* Média / Hora */}
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold block">
                      Média / Hora
                    </span>
                    <div className="flex items-baseline gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-2xl font-black text-sky-400 tracking-tight">
                        {displayedMetrics.mediaHora.toFixed(1).replace('.', ',')}
                      </span>
                      <MinimalDeltaBadge delta={deltas.mediaHora} />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#22222C] flex items-center justify-between text-[10px] text-slate-500 font-medium">
                  <span>
                    Média sist.:{' '}
                    <strong className="text-slate-400">
                      {Math.round(systemAverages.avgTotalTransferencias).toLocaleString('pt-BR')}/dia
                    </strong>
                  </span>
                  <span>
                    <strong className="text-slate-400">
                      {systemAverages.avgMediaHora.toFixed(1).replace('.', ',')}/h
                    </strong>
                  </span>
                </div>
              </div>

              {/* 2. PRODUÇÃO (5 cols) */}
              <div className="md:col-span-5 p-4 rounded-2xl bg-[#16161D] border border-[#262632] flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#FACC15] flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Produção
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  {/* Leads Indicados */}
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold block truncate">
                      Leads Indic.
                    </span>
                    <div className="flex flex-col items-start gap-1 mt-0.5">
                      <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        {displayedMetrics.leadsIndicados.toLocaleString('pt-BR')}
                      </span>
                      <MinimalDeltaBadge delta={deltas.leadsIndicados} />
                    </div>
                  </div>

                  {/* Contas Abertas */}
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold block truncate">
                      Contas Abertas
                    </span>
                    <div className="flex flex-col items-start gap-1 mt-0.5">
                      <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
                        {displayedMetrics.contasAbertas.toLocaleString('pt-BR')}
                      </span>
                      <MinimalDeltaBadge delta={deltas.contasAbertas} />
                    </div>
                  </div>

                  {/* % Conversão */}
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold block truncate">
                      % Conversão
                    </span>
                    <div className="flex flex-col items-start gap-1 mt-0.5">
                      <span className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">
                        {displayedMetrics.conversaoPct.toFixed(1).replace('.', ',')}%
                      </span>
                      <MinimalDeltaBadge delta={deltas.conversaoPct} />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#22222C] flex items-center justify-between text-[10px] text-slate-500 font-medium">
                  <span>
                    Média sist.: Leads{' '}
                    <strong className="text-slate-400">
                      {Math.round(systemAverages.avgLeadsIndicados)}
                    </strong>
                  </span>
                  <span>
                    Contas{' '}
                    <strong className="text-slate-400">
                      {Math.round(systemAverages.avgContasAbertas)}
                    </strong>
                  </span>
                  <span>
                    Conv.{' '}
                    <strong className="text-slate-400">
                      {systemAverages.avgConversaoPct.toFixed(1).replace('.', ',')}%
                    </strong>
                  </span>
                </div>
              </div>

              {/* 3. MAILING (3 cols) */}
              <div className="md:col-span-3 p-4 rounded-2xl bg-[#16161D] border border-[#262632] flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    Mailing
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  {/* % Produtividade */}
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold block truncate">
                      % Produtiv.
                    </span>
                    <div className="flex flex-col items-start gap-1 mt-0.5">
                      <span className="text-xl font-black text-white tracking-tight">
                        {displayedMetrics.produtividadeMailing.toFixed(1).replace('.', ',')}%
                      </span>
                      <MinimalDeltaBadge delta={deltas.produtividadeMailing} />
                    </div>
                  </div>

                  {/* % Atritados */}
                  <div>
                    <span className="text-[11px] text-slate-400 font-semibold block truncate">
                      % Atritados
                    </span>
                    <div className="flex flex-col items-start gap-1 mt-0.5">
                      <span className="text-xl font-black text-orange-400 tracking-tight">
                        {displayedMetrics.atritados.toFixed(1).replace('.', ',')}%
                      </span>
                      <MinimalDeltaBadge
                        delta={deltas.atritados}
                        invertColor={invertAtritadosColor}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#22222C] flex items-center justify-between text-[10px] text-slate-500 font-medium">
                  <span>
                    Média:{' '}
                    <strong className="text-slate-400">
                      {systemAverages.avgProdutividadeMailing.toFixed(1).replace('.', ',')}%
                    </strong>
                  </span>
                  <span>
                    Atrit:{' '}
                    <strong className="text-slate-400">
                      {systemAverages.avgAtritados.toFixed(1).replace('.', ',')}%
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* 7-Day Comparative Chart Section (Style matching reference image) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#16161D] border border-[#262632] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-white tracking-wide uppercase">
                    Desempenho dos Últimos 7 Dias — Leads Indicados vs. Contas Abertas
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Evolução diária comparativa encerrando em {formatBRDate(activeRange.end)}
                  </p>
                </div>

                {/* Subtle Chart Display Controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowPointLabels(!showPointLabels)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                      showPointLabels
                        ? 'bg-[#22222E] text-white border-slate-600'
                        : 'bg-[#121217] text-slate-400 border-[#252530]'
                    }`}
                    title="Mostrar ou ocultar números acima dos pontos"
                  >
                    {showPointLabels ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    <span>Rótulos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUseDualAxis(!useDualAxis)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      useDualAxis
                        ? 'bg-amber-500/15 text-[#FACC15] border-amber-500/40'
                        : 'bg-[#121217] text-slate-400 border-[#252530] hover:text-slate-200'
                    }`}
                    title="Alternar entre Escala Única ou Eixo Duplo proporcional"
                  >
                    {useDualAxis ? 'Eixo Duplo: ON' : 'Escala Única'}
                  </button>
                </div>
              </div>

              {/* Line Chart matching the uploaded reference style */}
              <div className="h-60 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chart7DaysSeries}
                    margin={{ top: 18, right: 24, left: -12, bottom: 4 }}
                  >
                    <CartesianGrid stroke="#262632" strokeDasharray="0" vertical={false} />
                    <XAxis
                      dataKey="shortLabel"
                      stroke="#64748B"
                      tickLine={false}
                      axisLine={{ stroke: '#334155' }}
                      tick={{ fontSize: 11, fontWeight: 700, fill: '#94A3B8' }}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#64748B"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                    />
                    {useDualAxis && (
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#38BDF8"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: '#38BDF8' }}
                      />
                    )}
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F0F14',
                        borderColor: '#2E2E3A',
                        borderRadius: '12px',
                        color: '#FFFFFF',
                        fontSize: '12px',
                        fontWeight: 600
                      }}
                      formatter={(val: any, name: any) => [
                        val,
                        name === 'leadsIndicados' ? 'Leads Indicados' : 'Contas Abertas'
                      ]}
                      labelFormatter={(label: any) => `Dia ${label}`}
                    />
                    {/* Vertical highlight line on the reference day (like the reference image) */}
                    {chart7DaysSeries.length > 0 && (
                      <ReferenceLine
                        yAxisId="left"
                        x={chart7DaysSeries[chart7DaysSeries.length - 1].shortLabel}
                        stroke="#475569"
                        strokeDasharray="3 3"
                      />
                    )}
                    <Line
                      yAxisId="left"
                      type="linear"
                      dataKey="leadsIndicados"
                      name="leadsIndicados"
                      stroke="#84CC16"
                      strokeWidth={2.75}
                      dot={{ r: 4.5, fill: '#84CC16', stroke: '#111115', strokeWidth: 1.5 }}
                      activeDot={{ r: 6.5, fill: '#A3E635' }}
                    >
                      {showPointLabels && (
                        <LabelList
                          dataKey="leadsIndicados"
                          position="top"
                          offset={8}
                          style={{ fill: '#A3E635', fontSize: 10, fontWeight: 800 }}
                        />
                      )}
                    </Line>
                    <Line
                      yAxisId={useDualAxis ? 'right' : 'left'}
                      type="linear"
                      dataKey="contasAbertas"
                      name="contasAbertas"
                      stroke="#38BDF8"
                      strokeWidth={2.75}
                      dot={{ r: 4.5, fill: '#38BDF8', stroke: '#111115', strokeWidth: 1.5 }}
                      activeDot={{ r: 6.5, fill: '#7DD3FC' }}
                    >
                      {showPointLabels && (
                        <LabelList
                          dataKey="contasAbertas"
                          position="bottom"
                          offset={8}
                          style={{ fill: '#7DD3FC', fontSize: 10, fontWeight: 800 }}
                        />
                      )}
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Clean Bottom Legend matching the reference image */}
              <div className="flex items-center justify-center gap-8 pt-2 border-t border-[#22222C] text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    <span className="w-2.5 h-0.5 bg-lime-500 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-lime-500 inline-block -mx-0.5" />
                    <span className="w-2.5 h-0.5 bg-lime-500 inline-block" />
                  </div>
                  <span className="font-bold text-slate-200">Leads Indicados</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center">
                    <span className="w-2.5 h-0.5 bg-sky-400 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block -mx-0.5" />
                    <span className="w-2.5 h-0.5 bg-sky-400 inline-block" />
                  </div>
                  <span className="font-bold text-slate-200">Contas Abertas</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Minimalist % Delta Indicator Badge with up/down arrow
 */
const MinimalDeltaBadge: React.FC<{
  delta: number | null;
  invertColor?: boolean;
}> = ({ delta, invertColor = false }) => {
  if (delta === null || isNaN(delta)) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-500 px-1.5 py-0.5 rounded-md bg-slate-800/40">
        <Minus className="w-2.5 h-2.5" /> 0%
      </span>
    );
  }

  const isNeutral = Math.abs(delta) < 0.05;
  const isUp = delta > 0;
  const isPositiveOutcome = invertColor ? !isUp : isUp;

  if (isNeutral) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-400 px-1.5 py-0.5 rounded-md bg-slate-800/60">
        <Minus className="w-2.5 h-2.5" /> 0,0%
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
        isPositiveOutcome
          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
          : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
      }`}
      title={`${isUp ? 'Acima' : 'Abaixo'} da média existente no sistema`}
    >
      {isUp ? (
        <ArrowUpRight className="w-3 h-3 flex-shrink-0" />
      ) : (
        <ArrowDownRight className="w-3 h-3 flex-shrink-0" />
      )}
      <span>{Math.abs(delta).toFixed(1).replace('.', ',')}%</span>
    </span>
  );
};

function formatBRDate(yyyyMmDd: string): string {
  if (!yyyyMmDd) return '';
  const parts = yyyyMmDd.split('-');
  if (parts.length !== 3) return yyyyMmDd;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
