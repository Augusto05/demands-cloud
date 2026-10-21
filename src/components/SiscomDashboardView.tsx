import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Copy,
  Check,
  Save,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Maximize2,
  Minimize2,
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

  // UI & Chart Options (Controlled from the Left Control Panel)
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

  // Populate form inputs whenever selectedDate changes
  useEffect(() => {
    const existing = store.records[selectedDate];
    if (existing) {
      setHorasRodadas(existing.horasRodadas > 0 ? String(existing.horasRodadas) : '');
      setTotalTransferencias(
        existing.totalTransferencias > 0 ? String(existing.totalTransferencias) : ''
      );
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

  // Live preview record merges current form state onto selectedDate
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
    if (mode === 'ontem') {
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

  // Active date range for Dashboard display
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

  // Render Clean Neutral PNG Canvas directly from data
  const generateDashboardCanvas = (): HTMLCanvasElement => {
    const scale = 2;
    const width = 880;
    const height = 560;
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);

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

    // Pure Demands Dark Background (#0A0A0A / #101010)
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, width, height);

    roundRect(16, 16, width - 32, height - 32, 16);
    ctx.fillStyle = '#101010';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#222222';
    ctx.stroke();

    // Header
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 18px Inter, system-ui, sans-serif';
    ctx.fillText('DASHBOARD SISCOM', 36, 50);

    ctx.fillStyle = '#737373';
    ctx.font = '500 11px Inter, system-ui, sans-serif';
    ctx.fillText('Comparativo vs. média histórica', 36, 67);

    // Date Badge on Right
    const periodLabel = activeRange.isSingleDay
      ? formatBRDate(activeRange.start)
      : `${formatBRDate(activeRange.start)} a ${formatBRDate(activeRange.end)}`;
    ctx.font = '700 12px Inter, system-ui, sans-serif';
    const badgeW = ctx.measureText(periodLabel).width + 24;
    roundRect(width - 36 - badgeW, 38, badgeW, 28, 8);
    ctx.fillStyle = '#161616';
    ctx.fill();
    ctx.strokeStyle = '#262626';
    ctx.stroke();

    ctx.fillStyle = '#E5E5E5';
    ctx.fillText(periodLabel, width - 36 - badgeW + 12, 56);

    // Header Divider
    ctx.strokeStyle = '#1F1F1F';
    ctx.beginPath();
    ctx.moveTo(36, 82);
    ctx.lineTo(width - 36, 82);
    ctx.stroke();

    // Helper for minimalist delta text (arrow + %)
    const drawDelta = (x: number, y: number, delta: number | null, invertColor = false) => {
      if (delta === null || isNaN(delta)) {
        ctx.font = '700 11px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#525252';
        ctx.fillText('— 0%', x, y);
        return;
      }
      const isZero = Math.abs(delta) < 0.05;
      const isUp = delta > 0;
      const isGood = invertColor ? !isUp : isUp;

      const arrow = isZero ? '—' : isUp ? '↑' : '↓';
      const txt = `${arrow} ${Math.abs(delta).toFixed(1).replace('.', ',')}%`;

      ctx.font = '700 11px Inter, system-ui, sans-serif';
      ctx.fillStyle = isZero ? '#737373' : isGood ? '#34D399' : '#F87171';
      ctx.fillText(txt, x, y);
    };

    // 3 Section Blocks (TRANSFERÊNCIAS | PRODUÇÃO | MAILING)
    const topY = 96;
    const boxH = 114;
    const gap = 12;
    const totalInnerW = width - 72;
    const col1W = Math.floor(totalInnerW * 0.30);
    const col2W = Math.floor(totalInnerW * 0.42);
    const col3W = totalInnerW - col1W - col2W - gap * 2;

    const col1X = 36;
    const col2X = col1X + col1W + gap;
    const col3X = col2X + col2W + gap;

    // --- BLOCK 1: TRANSFERÊNCIAS ---
    roundRect(col1X, topY, col1W, boxH, 12);
    ctx.fillStyle = '#161616';
    ctx.fill();
    ctx.strokeStyle = '#222222';
    ctx.stroke();

    ctx.fillStyle = '#737373';
    ctx.font = '800 10px Inter, system-ui, sans-serif';
    ctx.fillText('TRANSFERÊNCIAS', col1X + 16, topY + 24);

    const mY = topY + 48;
    // Total do Dia
    ctx.fillStyle = '#A3A3A3';
    ctx.font = '500 11px Inter, system-ui, sans-serif';
    ctx.fillText(activeRange.isSingleDay ? 'Total do Dia' : 'Total Período', col1X + 16, mY);

    const valTransfStr = displayedMetrics.totalTransferencias.toLocaleString('pt-BR');
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 22px Inter, system-ui, sans-serif';
    ctx.fillText(valTransfStr, col1X + 16, mY + 26);
    const wTransf = ctx.measureText(valTransfStr).width;
    drawDelta(col1X + 16 + wTransf + 6, mY + 23, deltas.transferencias);

    // Média / Hora
    const col1MidX = col1X + Math.floor(col1W * 0.53);
    ctx.fillStyle = '#A3A3A3';
    ctx.font = '500 11px Inter, system-ui, sans-serif';
    ctx.fillText('Média / Hora', col1MidX, mY);

    const valMediaHStr = displayedMetrics.mediaHora.toFixed(1).replace('.', ',');
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 22px Inter, system-ui, sans-serif';
    ctx.fillText(valMediaHStr, col1MidX, mY + 26);
    const wMediaH = ctx.measureText(valMediaHStr).width;
    drawDelta(col1MidX + wMediaH + 6, mY + 23, deltas.mediaHora);

    // --- BLOCK 2: PRODUÇÃO ---
    roundRect(col2X, topY, col2W, boxH, 12);
    ctx.fillStyle = '#161616';
    ctx.fill();
    ctx.strokeStyle = '#222222';
    ctx.stroke();

    ctx.fillStyle = '#737373';
    ctx.font = '800 10px Inter, system-ui, sans-serif';
    ctx.fillText('PRODUÇÃO', col2X + 16, topY + 24);

    const pSubW = Math.floor((col2W - 32) / 3);
    // Leads Indicados
    ctx.fillStyle = '#A3A3A3';
    ctx.font = '500 11px Inter, system-ui, sans-serif';
    ctx.fillText('Leads Indicados', col2X + 16, mY);

    const valLeadsStr = displayedMetrics.leadsIndicados.toLocaleString('pt-BR');
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 22px Inter, system-ui, sans-serif';
    ctx.fillText(valLeadsStr, col2X + 16, mY + 26);
    const wLeads = ctx.measureText(valLeadsStr).width;
    drawDelta(col2X + 16 + wLeads + 6, mY + 23, deltas.leadsIndicados);

    // Contas Abertas
    const p2X = col2X + 16 + pSubW;
    ctx.fillStyle = '#A3A3A3';
    ctx.font = '500 11px Inter, system-ui, sans-serif';
    ctx.fillText('Contas Abertas', p2X, mY);

    const valContasStr = displayedMetrics.contasAbertas.toLocaleString('pt-BR');
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 22px Inter, system-ui, sans-serif';
    ctx.fillText(valContasStr, p2X, mY + 26);
    const wContas = ctx.measureText(valContasStr).width;
    drawDelta(p2X + wContas + 6, mY + 23, deltas.contasAbertas);

    // % Conversão
    const p3X = col2X + 16 + pSubW * 2;
    ctx.fillStyle = '#A3A3A3';
    ctx.font = '500 11px Inter, system-ui, sans-serif';
    ctx.fillText('% Conversão', p3X, mY);

    const valConvStr = `${displayedMetrics.conversaoPct.toFixed(1).replace('.', ',')}%`;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 22px Inter, system-ui, sans-serif';
    ctx.fillText(valConvStr, p3X, mY + 26);
    const wConv = ctx.measureText(valConvStr).width;
    drawDelta(p3X + wConv + 6, mY + 23, deltas.conversaoPct);

    // --- BLOCK 3: MAILING ---
    roundRect(col3X, topY, col3W, boxH, 12);
    ctx.fillStyle = '#161616';
    ctx.fill();
    ctx.strokeStyle = '#222222';
    ctx.stroke();

    ctx.fillStyle = '#737373';
    ctx.font = '800 10px Inter, system-ui, sans-serif';
    ctx.fillText('MAILING', col3X + 16, topY + 24);

    // % Produtividade
    ctx.fillStyle = '#A3A3A3';
    ctx.font = '500 11px Inter, system-ui, sans-serif';
    ctx.fillText('% Produtividade', col3X + 16, mY);

    const valProdStr = `${displayedMetrics.produtividadeMailing.toFixed(1).replace('.', ',')}%`;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 22px Inter, system-ui, sans-serif';
    ctx.fillText(valProdStr, col3X + 16, mY + 26);
    const wProd = ctx.measureText(valProdStr).width;
    drawDelta(col3X + 16 + wProd + 6, mY + 23, deltas.produtividadeMailing);

    // % Atritados
    const m3MidX = col3X + Math.floor(col3W * 0.53);
    ctx.fillStyle = '#A3A3A3';
    ctx.font = '500 11px Inter, system-ui, sans-serif';
    ctx.fillText('% Atritados', m3MidX, mY);

    const valAtritStr = `${displayedMetrics.atritados.toFixed(1).replace('.', ',')}%`;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 22px Inter, system-ui, sans-serif';
    ctx.fillText(valAtritStr, m3MidX, mY + 26);
    const wAtrit = ctx.measureText(valAtritStr).width;
    drawDelta(m3MidX + wAtrit + 6, mY + 23, deltas.atritados, invertAtritadosColor);

    // --- CHART BOX (LAST 7 DAYS: LEADS INDICADOS VS CONTAS ABERTAS) ---
    const chartBoxY = topY + boxH + 14;
    const chartBoxH = height - chartBoxY - 32;
    roundRect(36, chartBoxY, totalInnerW, chartBoxH, 12);
    ctx.fillStyle = '#161616';
    ctx.fill();
    ctx.strokeStyle = '#222222';
    ctx.stroke();

    ctx.fillStyle = '#D4D4D4';
    ctx.font = '700 11px Inter, system-ui, sans-serif';
    ctx.fillText(
      'COMPARATIVO ÚLTIMOS 7 DIAS — LEADS INDICADOS VS. CONTAS ABERTAS',
      52,
      chartBoxY + 26
    );

    const plotLeft = 80;
    const plotRight = width - 64;
    const plotTop = chartBoxY + 48;
    const plotBottom = chartBoxY + chartBoxH - 48;
    const plotW = plotRight - plotLeft;
    const plotH = plotBottom - plotTop;

    const maxLeads = Math.max(10, ...chart7DaysSeries.map(d => d.leadsIndicados));
    const maxContas = Math.max(5, ...chart7DaysSeries.map(d => d.contasAbertas));
    const globalMax = Math.ceil(Math.max(maxLeads, maxContas) * 1.15);

    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = plotBottom - (plotH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(plotLeft, y);
      ctx.lineTo(plotRight, y);
      ctx.stroke();

      const labelVal = Math.round(((useDualAxis ? maxLeads : globalMax) * i) / 4);
      ctx.fillStyle = '#737373';
      ctx.font = '500 10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(String(labelVal), plotLeft - 10, y + 3);
    }
    ctx.textAlign = 'left';

    const stepX = plotW / Math.max(1, chart7DaysSeries.length - 1);

    // Vertical reference line on last day
    const lastX = plotLeft + stepX * (chart7DaysSeries.length - 1);
    ctx.strokeStyle = '#2E2E2E';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(lastX, plotTop);
    ctx.lineTo(lastX, plotBottom);
    ctx.stroke();
    ctx.setLineDash([]);

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

    leadsPts.forEach(p => {
      ctx.fillStyle = '#737373';
      ctx.font = '600 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, p.x, plotBottom + 18);
    });

    // Line 1: Leads Indicados (#FACC15 - Brand Yellow)
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    leadsPts.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // Line 2: Contas Abertas (#A3A3A3 - Clean Neutral Light Gray/White)
    ctx.strokeStyle = '#E5E5E5';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    contasPts.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    leadsPts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#FACC15';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#161616';
      ctx.stroke();

      if (showPointLabels) {
        ctx.fillStyle = '#FACC15';
        ctx.font = '700 10px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(p.val), p.x, p.y - 8);
      }
    });

    contasPts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#E5E5E5';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#161616';
      ctx.stroke();

      if (showPointLabels) {
        ctx.fillStyle = '#E5E5E5';
        ctx.font = '700 10px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(p.val), p.x, p.y + 14);
      }
    });

    // Bottom Legend
    ctx.textAlign = 'left';
    const legY = chartBoxY + chartBoxH - 14;
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(width / 2 - 130, legY - 4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#D4D4D4';
    ctx.font = '600 11px Inter, system-ui, sans-serif';
    ctx.fillText('Leads Indicados', width / 2 - 120, legY);

    ctx.fillStyle = '#E5E5E5';
    ctx.beginPath();
    ctx.arc(width / 2 + 15, legY - 4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#D4D4D4';
    ctx.font = '600 11px Inter, system-ui, sans-serif';
    ctx.fillText('Contas Abertas', width / 2 + 25, legY);

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
          handleDownloadPNG();
        }
      }, 'image/png');
    } catch (e) {
      handleDownloadPNG();
    }
  };

  const formMediaHora = calcMediaHora(numTransferencias, numHoras);
  const formConversaoPct = calcConversaoPct(numContas, numLeads);

  return (
    <div className="space-y-5">
      {/* Top Action & Period Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#101010] border border-[#222222] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="mr-2">
            <h1 className="text-base font-black text-white tracking-wide leading-tight">
              Dashboard Siscom
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">
              Resultado diário & comparativo de 7 dias
            </p>
          </div>

          {/* Period Preset Pills */}
          <div className="flex items-center bg-[#161616] p-1 rounded-xl border border-[#222222]">
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
                    ? 'bg-[#FACC15] text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {(filterMode === '7dias' || filterMode === 'mes' || filterMode === 'custom') && (
            <div className="flex items-center gap-2 bg-[#161616] px-3 py-1.5 rounded-xl border border-[#222222] text-xs">
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
                ? 'bg-[#1F1F1F] text-[#FACC15] border-[#FACC15]/50'
                : 'bg-[#161616] text-slate-300 border-[#222222] hover:text-white hover:bg-[#1C1C1C]'
            }`}
          >
            {isPrintMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isPrintMode ? 'Sair do Modo Print' : 'Modo Print'}</span>
          </button>

          <button
            onClick={handleCopyImageToClipboard}
            className="px-3.5 py-2 rounded-xl text-xs font-bold border bg-[#161616] text-slate-200 border-[#222222] hover:bg-[#1C1C1C] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {copiedImage ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedImage ? 'Copiada!' : 'Copiar Imagem'}</span>
          </button>

          <button
            onClick={handleDownloadPNG}
            disabled={downloadingImage}
            className="px-4 py-2 rounded-xl bg-[#FACC15] hover:bg-amber-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Baixar PNG</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout */}
      <div
        className={`grid grid-cols-1 ${
          isPrintMode ? 'lg:grid-cols-1 max-w-4xl mx-auto' : 'xl:grid-cols-12'
        } gap-6 items-start`}
      >
        {/* LEFT COLUMN: Daily Data Entry & Chart Controls (Hidden in Print Mode) */}
        {!isPrintMode && (
          <div className="xl:col-span-5 space-y-4">
            <form
              onSubmit={handleSaveRecord}
              className="p-5 rounded-2xl bg-[#101010] border border-[#222222] space-y-4"
            >
              {/* Date Selector Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#222222]">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 block">
                    LANÇAMENTO DIÁRIO
                  </span>
                  <h2 className="text-sm font-bold text-white">
                    {selectedDate === todayStr
                      ? `Hoje (${formatBRDate(selectedDate)})`
                      : `Dia ${formatBRDate(selectedDate)}`}
                  </h2>
                </div>

                {/* Date Navigation Controls */}
                <div className="flex items-center gap-1 bg-[#161616] p-1 rounded-xl border border-[#222222]">
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
                    className="bg-transparent text-xs font-bold text-white px-1.5 py-1 focus:outline-none cursor-pointer"
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
                      className="px-2 py-1 rounded-lg bg-[#222222] text-slate-200 text-[10px] font-bold hover:text-white transition-colors cursor-pointer"
                    >
                      Hoje
                    </button>
                  )}
                </div>
              </div>

              {/* SECTION 1: TRANSFERÊNCIAS */}
              <div className="p-3.5 rounded-xl bg-[#161616] border border-[#222222] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300">
                    Transferências
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">
                    Média/Hora: <strong className="text-white">{formMediaHora.toFixed(1).replace('.', ',')}/h</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Horas rodadas (oculto)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="Ex: 8.5"
                      value={horasRodadas}
                      onChange={e => setHorasRodadas(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#222222] text-sm font-bold text-white focus:outline-none focus:border-slate-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Total do dia
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Ex: 420"
                      value={totalTransferencias}
                      onChange={e => setTotalTransferencias(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#222222] text-sm font-bold text-white focus:outline-none focus:border-slate-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: PRODUÇÃO */}
              <div className="p-3.5 rounded-xl bg-[#161616] border border-[#222222] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300">
                    Produção
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">
                    Conversão: <strong className="text-white">{formConversaoPct.toFixed(1).replace('.', ',')}%</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Leads Indicados
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Ex: 180"
                      value={leadsIndicados}
                      onChange={e => setLeadsIndicados(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#222222] text-sm font-bold text-white focus:outline-none focus:border-slate-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      Contas Abertas
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Ex: 45"
                      value={contasAbertas}
                      onChange={e => setContasAbertas(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#222222] text-sm font-bold text-white focus:outline-none focus:border-slate-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: MAILING */}
              <div className="p-3.5 rounded-xl bg-[#161616] border border-[#222222] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300">
                    Mailing
                  </span>
                  <button
                    type="button"
                    onClick={() => setInvertAtritadosColor(!invertAtritadosColor)}
                    className="text-[10px] font-medium text-slate-400 hover:text-slate-200 underline cursor-pointer"
                  >
                    Atritados: {invertAtritadosColor ? 'Menor = Positivo' : 'Maior = Positivo'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      % Produtividade do Mailing
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ex: 38.5"
                      value={produtividadeMailing}
                      onChange={e => setProdutividadeMailing(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#222222] text-sm font-bold text-white focus:outline-none focus:border-slate-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-400 mb-1">
                      % Atritados
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ex: 6.4"
                      value={atritados}
                      onChange={e => setAtritados(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0D0D0D] border border-[#222222] text-sm font-bold text-white focus:outline-none focus:border-slate-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Chart Visual Controls (Moved here from the print area) */}
              <div className="p-3 rounded-xl bg-[#161616] border border-[#222222] flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-400">Opções do Gráfico:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPointLabels(!showPointLabels)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                      showPointLabels
                        ? 'bg-[#222222] text-white border-[#333333]'
                        : 'bg-[#101010] text-slate-400 border-[#222222]'
                    }`}
                  >
                    {showPointLabels ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    <span>Rótulos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUseDualAxis(!useDualAxis)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                      useDualAxis
                        ? 'bg-[#222222] text-white border-[#333333]'
                        : 'bg-[#101010] text-slate-400 border-[#222222]'
                    }`}
                  >
                    {useDualAxis ? 'Eixo Duplo' : 'Escala Única'}
                  </button>
                </div>
              </div>

              {/* Submit / Delete Action Row */}
              <div className="flex items-center justify-between gap-3 pt-1">
                {store.records[selectedDate] ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteDate(selectedDate)}
                    className="px-3 py-2.5 rounded-xl bg-[#161616] hover:bg-rose-950/30 text-slate-400 hover:text-rose-400 border border-[#222222] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Limpar</span>
                  </button>
                ) : (
                  <div />
                )}

                <button
                  type="submit"
                  disabled={isSyncing}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    saveSuccess
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-[#FACC15] hover:bg-amber-400 text-slate-950'
                  }`}
                >
                  {saveSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Salvo!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>
                        {store.records[selectedDate]
                          ? `Atualizar (${formatBRDate(selectedDate)})`
                          : `Salvar (${formatBRDate(selectedDate)})`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Quick Access History of Previous Days */}
            <div className="p-4 rounded-2xl bg-[#101010] border border-[#222222] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Histórico de Dias ({historyList.length})
                </h3>
                <span className="text-[10px] text-slate-500">Clique para editar</span>
              </div>

              {historyList.length === 0 ? (
                <p className="text-xs text-slate-500 py-2 text-center">
                  Nenhum registro salvo.
                </p>
              ) : (
                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {historyList.map(item => {
                    const isSelected = item.date === selectedDate;
                    const itemConv = calcConversaoPct(item.contasAbertas, item.leadsIndicados);
                    return (
                      <div
                        key={item.date}
                        onClick={() => {
                          setSelectedDate(item.date);
                          setFilterMode('dia');
                        }}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#1A1A1A] border-[#383838] text-white'
                            : 'bg-[#141414] border-[#222222] text-slate-300 hover:border-[#2E2E2E]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-white">{formatBRDate(item.date)}</span>
                          <span className="text-[11px] text-slate-400">
                            Transf: <strong className="text-slate-200">{item.totalTransferencias}</strong>
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          <span>
                            Leads: <strong className="text-slate-200">{item.leadsIndicados}</strong>
                          </span>
                          <span>
                            Contas: <strong className="text-slate-200">{item.contasAbertas}</strong>
                          </span>
                          <span className="text-slate-300 font-bold">{itemConv.toFixed(1)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* RIGHT COLUMN: Clean Neutral Dashboard Card (Screenshot Ready) */}
        <div className={`${isPrintMode ? 'col-span-1' : 'xl:col-span-7'}`}>
          <div
            ref={captureCardRef}
            className="p-6 rounded-2xl bg-[#101010] border border-[#222222] space-y-5"
          >
            {/* Card Header */}
            <div className="flex items-center justify-between gap-3 border-b border-[#222222] pb-4">
              <div>
                <h2 className="text-lg font-black text-white tracking-tight">
                  DASHBOARD SISCOM
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  Comparativo vs. média histórica
                </p>
              </div>

              <div className="px-3 py-1.5 rounded-xl bg-[#161616] border border-[#222222]">
                <span className="text-xs font-bold text-slate-200">
                  {activeRange.isSingleDay
                    ? formatBRDate(activeRange.start)
                    : `${formatBRDate(activeRange.start)} a ${formatBRDate(activeRange.end)}`}
                </span>
              </div>
            </div>

            {/* 3 Compact Neutral KPI Blocks: TRANSFERÊNCIAS | PRODUÇÃO | MAILING */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
              {/* 1. TRANSFERÊNCIAS */}
              <div className="md:col-span-4 p-4 rounded-xl bg-[#161616] border border-[#222222] space-y-3">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                  Transferências
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block">
                      {activeRange.isSingleDay ? 'Total do Dia' : 'Total Período'}
                    </span>
                    <div className="flex items-baseline gap-1.5 mt-1 flex-wrap">
                      <span className="text-2xl font-black text-white tracking-tight">
                        {displayedMetrics.totalTransferencias.toLocaleString('pt-BR')}
                      </span>
                      <MinimalDeltaBadge delta={deltas.transferencias} />
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block">
                      Média / Hora
                    </span>
                    <div className="flex items-baseline gap-1.5 mt-1 flex-wrap">
                      <span className="text-2xl font-black text-white tracking-tight">
                        {displayedMetrics.mediaHora.toFixed(1).replace('.', ',')}
                      </span>
                      <MinimalDeltaBadge delta={deltas.mediaHora} />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. PRODUÇÃO */}
              <div className="md:col-span-5 p-4 rounded-xl bg-[#161616] border border-[#222222] space-y-3">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                  Produção
                </span>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block truncate">
                      Leads Indic.
                    </span>
                    <div className="flex items-baseline gap-1.5 mt-1 flex-wrap">
                      <span className="text-2xl font-black text-white tracking-tight">
                        {displayedMetrics.leadsIndicados.toLocaleString('pt-BR')}
                      </span>
                      <MinimalDeltaBadge delta={deltas.leadsIndicados} />
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block truncate">
                      Contas Abertas
                    </span>
                    <div className="flex items-baseline gap-1.5 mt-1 flex-wrap">
                      <span className="text-2xl font-black text-white tracking-tight">
                        {displayedMetrics.contasAbertas.toLocaleString('pt-BR')}
                      </span>
                      <MinimalDeltaBadge delta={deltas.contasAbertas} />
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block truncate">
                      % Conversão
                    </span>
                    <div className="flex items-baseline gap-1.5 mt-1 flex-wrap">
                      <span className="text-2xl font-black text-white tracking-tight">
                        {displayedMetrics.conversaoPct.toFixed(1).replace('.', ',')}%
                      </span>
                      <MinimalDeltaBadge delta={deltas.conversaoPct} />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. MAILING */}
              <div className="md:col-span-3 p-4 rounded-xl bg-[#161616] border border-[#222222] space-y-3">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                  Mailing
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block truncate">
                      % Produtiv.
                    </span>
                    <div className="flex items-baseline gap-1.5 mt-1 flex-wrap">
                      <span className="text-2xl font-black text-white tracking-tight">
                        {displayedMetrics.produtividadeMailing.toFixed(1).replace('.', ',')}%
                      </span>
                      <MinimalDeltaBadge delta={deltas.produtividadeMailing} />
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block truncate">
                      % Atritados
                    </span>
                    <div className="flex items-baseline gap-1.5 mt-1 flex-wrap">
                      <span className="text-2xl font-black text-white tracking-tight">
                        {displayedMetrics.atritados.toFixed(1).replace('.', ',')}%
                      </span>
                      <MinimalDeltaBadge
                        delta={deltas.atritados}
                        invertColor={invertAtritadosColor}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 7-Day Comparative Chart Section */}
            <div className="p-5 rounded-xl bg-[#161616] border border-[#222222] space-y-3">
              <div>
                <h3 className="text-xs font-extrabold text-slate-300 tracking-wider uppercase">
                  Comparativo Últimos 7 Dias — Leads Indicados vs. Contas Abertas
                </h3>
              </div>

              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chart7DaysSeries}
                    margin={{ top: 18, right: 20, left: -16, bottom: 4 }}
                  >
                    <CartesianGrid stroke="#222222" strokeDasharray="0" vertical={false} />
                    <XAxis
                      dataKey="shortLabel"
                      stroke="#525252"
                      tickLine={false}
                      axisLine={{ stroke: '#262626' }}
                      tick={{ fontSize: 11, fontWeight: 600, fill: '#737373' }}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#525252"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: '#737373' }}
                    />
                    {useDualAxis && (
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#737373"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: '#737373' }}
                      />
                    )}
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#101010',
                        borderColor: '#222222',
                        borderRadius: '10px',
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
                    {chart7DaysSeries.length > 0 && (
                      <ReferenceLine
                        yAxisId="left"
                        x={chart7DaysSeries[chart7DaysSeries.length - 1].shortLabel}
                        stroke="#2E2E2E"
                        strokeDasharray="3 3"
                      />
                    )}
                    <Line
                      yAxisId="left"
                      type="linear"
                      dataKey="leadsIndicados"
                      name="leadsIndicados"
                      stroke="#FACC15"
                      strokeWidth={2.2}
                      dot={{ r: 4, fill: '#FACC15', stroke: '#161616', strokeWidth: 1.5 }}
                      activeDot={{ r: 6, fill: '#FACC15' }}
                    >
                      {showPointLabels && (
                        <LabelList
                          dataKey="leadsIndicados"
                          position="top"
                          offset={8}
                          style={{ fill: '#FACC15', fontSize: 10, fontWeight: 700 }}
                        />
                      )}
                    </Line>
                    <Line
                      yAxisId={useDualAxis ? 'right' : 'left'}
                      type="linear"
                      dataKey="contasAbertas"
                      name="contasAbertas"
                      stroke="#E5E5E5"
                      strokeWidth={2.2}
                      dot={{ r: 4, fill: '#E5E5E5', stroke: '#161616', strokeWidth: 1.5 }}
                      activeDot={{ r: 6, fill: '#FFFFFF' }}
                    >
                      {showPointLabels && (
                        <LabelList
                          dataKey="contasAbertas"
                          position="bottom"
                          offset={8}
                          style={{ fill: '#E5E5E5', fontSize: 10, fontWeight: 700 }}
                        />
                      )}
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Clean Bottom Legend */}
              <div className="flex items-center justify-center gap-8 pt-2 border-t border-[#222222] text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FACC15] inline-block" />
                  <span className="font-semibold text-slate-300">Leads Indicados</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-neutral-200 inline-block" />
                  <span className="font-semibold text-slate-300">Contas Abertas</span>
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
 * Minimalist % Delta Indicator (no box background, just clean arrow + percentage)
 */
const MinimalDeltaBadge: React.FC<{
  delta: number | null;
  invertColor?: boolean;
}> = ({ delta, invertColor = false }) => {
  if (delta === null || isNaN(delta)) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-slate-600">
        <Minus className="w-3 h-3" /> 0%
      </span>
    );
  }

  const isNeutral = Math.abs(delta) < 0.05;
  const isUp = delta > 0;
  const isPositiveOutcome = invertColor ? !isUp : isUp;

  if (isNeutral) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-slate-500">
        <Minus className="w-3 h-3" /> 0,0%
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${
        isPositiveOutcome ? 'text-emerald-400' : 'text-rose-400'
      }`}
      title={`${isUp ? 'Acima' : 'Abaixo'} da média histórica`}
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
