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
  LabelList,
  PieChart,
  Pie,
  Cell
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
type MailingViewMode = 'padrao' | 'grafico';

const MAILING_COLORS = {
  produtivo: '#26D09B',
  improdutivo: '#F2445C',
  atritado: '#9F67FF'
};

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
  const [improdutivos, setImprodutivos] = useState<string>('');
  const [atritados, setAtritados] = useState<string>('');

  // UI & Chart Options
  const [isPrintMode, setIsPrintMode] = useState<boolean>(false);
  const [mailingViewMode, setMailingViewMode] = useState<MailingViewMode>('padrao');
  const [useDualAxis, setUseDualAxis] = useState<boolean>(true);
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
      setImprodutivos(
        existing.improdutivos && existing.improdutivos > 0 ? String(existing.improdutivos) : ''
      );
      setAtritados(existing.atritados > 0 ? String(existing.atritados) : '');
    } else {
      setHorasRodadas('');
      setTotalTransferencias('');
      setLeadsIndicados('');
      setContasAbertas('');
      setProdutividadeMailing('');
      setImprodutivos('');
      setAtritados('');
    }
  }, [selectedDate, store.records[selectedDate]?.updatedAt]);

  // Parse current live form numbers
  const numHoras = parseFloat(horasRodadas.replace(',', '.')) || 0;
  const numTransferencias = parseInt(totalTransferencias, 10) || 0;
  const numLeads = parseInt(leadsIndicados, 10) || 0;
  const numContas = parseInt(contasAbertas, 10) || 0;
  const numProdMailing = parseFloat(produtividadeMailing.replace(',', '.')) || 0;
  const numImprodutivos = parseFloat(improdutivos.replace(',', '.')) || 0;
  const numAtritados = parseFloat(atritados.replace(',', '.')) || 0;

  // Live preview record merges current form state onto selectedDate
  const effectiveRecordsMap = useMemo(() => {
    const hasFormInput =
      numHoras > 0 ||
      numTransferencias > 0 ||
      numLeads > 0 ||
      numContas > 0 ||
      numProdMailing > 0 ||
      numImprodutivos > 0 ||
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
        improdutivos: numImprodutivos,
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
    numImprodutivos,
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
        improdutivos: numImprodutivos,
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
        setImprodutivos('');
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
      const improd = rec ? rec.improdutivos || 0 : 0;
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
        improdutivos: improd,
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
          (r.improdutivos || 0) > 0 ||
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
        improdutivos: 0,
        atritados: 0
      };
    }

    const sumTransf = matchingRecords.reduce((s, r) => s + r.totalTransferencias, 0);
    const sumHoras = matchingRecords.reduce((s, r) => s + r.horasRodadas, 0);
    const sumLeads = matchingRecords.reduce((s, r) => s + r.leadsIndicados, 0);
    const sumContas = matchingRecords.reduce((s, r) => s + r.contasAbertas, 0);
    const sumProd = matchingRecords.reduce((s, r) => s + r.produtividadeMailing, 0);
    const sumImprod = matchingRecords.reduce((s, r) => s + (r.improdutivos || 0), 0);
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
      improdutivos: sumImprod / count,
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

  // Donut Chart Data for Mailing
  const mailingPieData = useMemo(() => {
    const prod = Math.max(0, displayedMetrics.produtividadeMailing);
    const improd = Math.max(0, displayedMetrics.improdutivos);
    const atrit = Math.max(0, displayedMetrics.atritados);
    const total = prod + improd + atrit;

    if (total <= 0) {
      return [
        { name: 'Produtivo', value: 1, raw: 0, color: MAILING_COLORS.produtivo },
        { name: 'Improdutivo', value: 1, raw: 0, color: MAILING_COLORS.improdutivo },
        { name: 'Atritado', value: 1, raw: 0, color: MAILING_COLORS.atritado }
      ];
    }

    return [
      { name: 'Produtivo', value: prod, raw: prod, color: MAILING_COLORS.produtivo },
      { name: 'Improdutivo', value: improd, raw: improd, color: MAILING_COLORS.improdutivo },
      { name: 'Atritado', value: atrit, raw: atrit, color: MAILING_COLORS.atritado }
    ].filter(d => d.value > 0);
  }, [
    displayedMetrics.produtividadeMailing,
    displayedMetrics.improdutivos,
    displayedMetrics.atritados
  ]);

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
          (r.improdutivos || 0) > 0 ||
          r.atritados > 0
      )
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [store.records]);

  // Render Clean Neutral PNG Canvas directly from data (without outer border around the screen)
  const generateDashboardCanvas = (): HTMLCanvasElement => {
    const scale = 2;
    const width = 920;
    const isDonut = mailingViewMode === 'grafico';
    const topBoxH = isDonut ? 168 : 108;
    const height = isDonut ? 600 : 540;
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

    // Pure Demands Dark Background (#0A0A0A) - NO outer border around the screen
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, width, height);

    const padX = 24;
    const totalInnerW = width - padX * 2;

    // Header
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 18px Inter, system-ui, sans-serif';
    ctx.fillText('DASHBOARD SISCOM', padX, 38);

    ctx.fillStyle = '#737373';
    ctx.font = '500 11px Inter, system-ui, sans-serif';
    ctx.fillText('Comparativo vs. média histórica', padX, 55);

    // Date Badge on Right
    const periodLabel = activeRange.isSingleDay
      ? formatBRDate(activeRange.start)
      : `${formatBRDate(activeRange.start)} a ${formatBRDate(activeRange.end)}`;
    ctx.font = '700 12px Inter, system-ui, sans-serif';
    const badgeW = ctx.measureText(periodLabel).width + 24;
    roundRect(width - padX - badgeW, 26, badgeW, 28, 8);
    ctx.fillStyle = '#141414';
    ctx.fill();
    ctx.strokeStyle = '#222222';
    ctx.stroke();

    ctx.fillStyle = '#E5E5E5';
    ctx.fillText(periodLabel, width - padX - badgeW + 12, 44);

    // Helper for compact pill badge next to value
    const drawDeltaPill = (x: number, y: number, delta: number | null, invertColor = false) => {
      const val = delta === null || isNaN(delta) ? 0 : delta;
      const isZero = Math.abs(val) < 0.05;
      const isUp = val > 0;
      const isGood = invertColor ? !isUp : isUp;

      const arrow = isZero ? '—' : isUp ? '↗' : '↘';
      const formattedNum =
        Math.abs(val) >= 99.95
          ? `${Math.round(Math.abs(val))}%`
          : `${Math.abs(val).toFixed(1).replace('.', ',')}%`;
      const txt = `${arrow} ${formattedNum}`;

      ctx.font = '700 9.5px Inter, system-ui, sans-serif';
      const tw = ctx.measureText(txt).width + 10;
      const th = 17;
      roundRect(x, y - 13, tw, th, 5);

      ctx.fillStyle = isZero
        ? '#1F1F1F'
        : isGood
        ? 'rgba(16, 185, 129, 0.12)'
        : 'rgba(244, 63, 94, 0.12)';
      ctx.fill();

      ctx.strokeStyle = isZero
        ? '#2A2A2A'
        : isGood
        ? 'rgba(16, 185, 129, 0.25)'
        : 'rgba(244, 63, 94, 0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = isZero ? '#737373' : isGood ? '#34D399' : '#FB7185';
      ctx.fillText(txt, x + 5, y - 1);
    };

    // 3 Section Blocks in 2 : 3 : 2 proportion
    const topY = 72;
    const gap = 12;
    const availW = totalInnerW - gap * 2;
    const col1W = Math.floor((availW * 2) / 7);
    const col2W = Math.floor((availW * 3) / 7);
    const col3W = availW - col1W - col2W;

    const col1X = padX;
    const col2X = col1X + col1W + gap;
    const col3X = col2X + col2W + gap;

    const drawMetricSlot = (
      x: number,
      y: number,
      label: string,
      valueStr: string,
      delta: number | null,
      invert = false
    ) => {
      ctx.fillStyle = '#A3A3A3';
      ctx.font = '500 11px Inter, system-ui, sans-serif';
      ctx.fillText(label, x, y);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 20px Inter, system-ui, sans-serif';
      ctx.fillText(valueStr, x, y + 25);
      const vw = ctx.measureText(valueStr).width;
      drawDeltaPill(x + vw + 6, y + 22, delta, invert);
    };

    const mY = isDonut ? topY + 64 : topY + 46;

    // --- BLOCK 1: TRANSFERÊNCIAS ---
    roundRect(col1X, topY, col1W, topBoxH, 12);
    ctx.fillStyle = '#141414';
    ctx.fill();
    ctx.strokeStyle = '#222222';
    ctx.stroke();

    ctx.fillStyle = '#737373';
    ctx.font = '800 10px Inter, system-ui, sans-serif';
    ctx.fillText('TRANSFERÊNCIAS', col1X + 16, topY + 22);

    const slot1W = Math.floor((col1W - 32) / 2);
    drawMetricSlot(
      col1X + 16,
      mY,
      activeRange.isSingleDay ? 'Total do Dia' : 'Total Período',
      displayedMetrics.totalTransferencias.toLocaleString('pt-BR'),
      deltas.transferencias
    );
    drawMetricSlot(
      col1X + 16 + slot1W,
      mY,
      'Média / Hora',
      displayedMetrics.mediaHora.toFixed(1).replace('.', ','),
      deltas.mediaHora
    );

    // --- BLOCK 2: PRODUÇÃO ---
    roundRect(col2X, topY, col2W, topBoxH, 12);
    ctx.fillStyle = '#141414';
    ctx.fill();
    ctx.strokeStyle = '#222222';
    ctx.stroke();

    ctx.fillStyle = '#737373';
    ctx.font = '800 10px Inter, system-ui, sans-serif';
    ctx.fillText('PRODUÇÃO', col2X + 16, topY + 22);

    const slot2W = Math.floor((col2W - 32) / 3);
    drawMetricSlot(
      col2X + 16,
      mY,
      'Leads Indicados',
      displayedMetrics.leadsIndicados.toLocaleString('pt-BR'),
      deltas.leadsIndicados
    );
    drawMetricSlot(
      col2X + 16 + slot2W,
      mY,
      'Contas Abertas',
      displayedMetrics.contasAbertas.toLocaleString('pt-BR'),
      deltas.contasAbertas
    );
    drawMetricSlot(
      col2X + 16 + slot2W * 2,
      mY,
      '% Conversão',
      `${displayedMetrics.conversaoPct.toFixed(1).replace('.', ',')}%`,
      deltas.conversaoPct
    );

    // --- BLOCK 3: MAILING ---
    roundRect(col3X, topY, col3W, topBoxH, 12);
    ctx.fillStyle = '#141414';
    ctx.fill();
    ctx.strokeStyle = '#222222';
    ctx.stroke();

    ctx.fillStyle = '#737373';
    ctx.font = '800 10px Inter, system-ui, sans-serif';
    ctx.fillText('MAILING', col3X + 16, topY + 22);

    if (!isDonut) {
      const slot3W = Math.floor((col3W - 32) / 2);
      drawMetricSlot(
        col3X + 16,
        mY,
        '% Produtividade',
        `${displayedMetrics.produtividadeMailing.toFixed(1).replace('.', ',')}%`,
        deltas.produtividadeMailing
      );
      drawMetricSlot(
        col3X + 16 + slot3W,
        mY,
        '% Atritados',
        `${displayedMetrics.atritados.toFixed(1).replace('.', ',')}%`,
        deltas.atritados,
        invertAtritadosColor
      );
    } else {
      // Draw Delta Pill for Produtividade at top right of Mailing card
      drawDeltaPill(col3X + col3W - 64, topY + 22, deltas.produtividadeMailing);

      // Draw Donut Chart in center of Mailing Card
      const centerX = col3X + col3W / 2;
      const centerY = topY + 86;
      const outerR = 44;
      const innerR = 27;

      const totalPie = mailingPieData.reduce((s, d) => s + d.value, 0);
      let currentAngle = -Math.PI / 2; // Start at 12 o'clock

      mailingPieData.forEach(slice => {
        const sliceAngle = (slice.value / Math.max(1, totalPie)) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerR, currentAngle, currentAngle + sliceAngle);
        ctx.arc(centerX, centerY, innerR, currentAngle + sliceAngle, currentAngle, true);
        ctx.closePath();
        ctx.fillStyle = slice.color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#141414';
        ctx.stroke();
        currentAngle += sliceAngle;
      });

      // Center Percentage of Produtivos
      const prodTxt = `${displayedMetrics.produtividadeMailing.toFixed(1).replace('.', ',')}%`;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(prodTxt, centerX, centerY + 4);
      ctx.textAlign = 'left';

      // Bottom Legend: Produtivo | Improdutivo | Atritado
      const legItems = [
        { label: 'Produtivo', color: MAILING_COLORS.produtivo },
        { label: 'Improdutivo', color: MAILING_COLORS.improdutivo },
        { label: 'Atritado', color: MAILING_COLORS.atritado }
      ];
      const legY = topY + topBoxH - 12;
      const legStartX = col3X + 18;
      const legSpacing = Math.floor((col3W - 32) / 3);

      legItems.forEach((item, idx) => {
        const lx = legStartX + idx * legSpacing;
        ctx.beginPath();
        ctx.arc(lx, legY - 3.5, 4, 0, Math.PI * 2);
        ctx.fillStyle = item.color;
        ctx.fill();

        ctx.fillStyle = '#A3A3A3';
        ctx.font = '500 10px Inter, system-ui, sans-serif';
        ctx.fillText(item.label, lx + 7, legY);
      });
    }

    // --- CHART BOX (LAST 7 DAYS: LEADS INDICADOS VS CONTAS ABERTAS) ---
    const chartBoxY = topY + topBoxH + 14;
    const chartBoxH = height - chartBoxY - 24;
    roundRect(padX, chartBoxY, totalInnerW, chartBoxH, 12);
    ctx.fillStyle = '#141414';
    ctx.fill();
    ctx.strokeStyle = '#222222';
    ctx.stroke();

    ctx.fillStyle = '#D4D4D4';
    ctx.font = '700 11px Inter, system-ui, sans-serif';
    ctx.fillText(
      'EVOLUÇÃO ÚLTIMOS 7 DIAS — LEADS INDICADOS VS. CONTAS ABERTAS',
      padX + 16,
      chartBoxY + 26
    );

    const plotLeft = padX + 44;
    const plotRight = width - padX - 44;
    const plotTop = chartBoxY + 50;
    const plotBottom = chartBoxY + chartBoxH - 48;
    const plotW = plotRight - plotLeft;
    const plotH = plotBottom - plotTop;

    const maxLeads = Math.max(10, ...chart7DaysSeries.map(d => d.leadsIndicados));
    const maxContas = Math.max(4, ...chart7DaysSeries.map(d => d.contasAbertas));
    const leadsAxisMax = Math.ceil(maxLeads * 1.2);
    const contasAxisMax = Math.ceil(maxContas * 1.35);
    const singleAxisMax = Math.ceil(Math.max(maxLeads, maxContas) * 1.2);

    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = plotBottom - (plotH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(plotLeft, y);
      ctx.lineTo(plotRight, y);
      ctx.stroke();

      const leftVal = Math.round(((useDualAxis ? leadsAxisMax : singleAxisMax) * i) / 4);
      ctx.fillStyle = '#737373';
      ctx.font = '500 10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(String(leftVal), plotLeft - 10, y + 3);

      if (useDualAxis) {
        const rightVal = Math.round((contasAxisMax * i) / 4);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#737373';
        ctx.fillText(String(rightVal), plotRight + 10, y + 3);
      }
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
      const denom = useDualAxis ? leadsAxisMax : singleAxisMax;
      const y = plotBottom - (pt.leadsIndicados / Math.max(1, denom)) * plotH;
      return { x, y, val: pt.leadsIndicados, label: pt.shortLabel };
    });

    const contasPts = chart7DaysSeries.map((pt, idx) => {
      const x = plotLeft + idx * stepX;
      const denom = useDualAxis ? contasAxisMax : singleAxisMax;
      const y = plotBottom - (pt.contasAbertas / Math.max(1, denom)) * plotH;
      return { x, y, val: pt.contasAbertas, label: pt.shortLabel };
    });

    leadsPts.forEach(p => {
      ctx.fillStyle = '#737373';
      ctx.font = '600 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, p.x, plotBottom + 18);
    });

    // Line 1: Leads Indicados (#FACC15)
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    leadsPts.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // Line 2: Contas Abertas (#E5E5E5)
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
      ctx.strokeStyle = '#141414';
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
      ctx.strokeStyle = '#141414';
      ctx.stroke();

      if (showPointLabels) {
        ctx.fillStyle = '#E5E5E5';
        ctx.font = '700 10px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(p.val), p.x, p.y - 8);
      }
    });

    // Bottom Legend
    ctx.textAlign = 'left';
    const legY = chartBoxY + chartBoxH - 14;
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(width / 2 - 140, legY - 4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#D4D4D4';
    ctx.font = '600 11px Inter, system-ui, sans-serif';
    ctx.fillText('Leads Indicados (Eixo Esq.)', width / 2 - 130, legY);

    ctx.fillStyle = '#E5E5E5';
    ctx.beginPath();
    ctx.arc(width / 2 + 30, legY - 4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#D4D4D4';
    ctx.font = '600 11px Inter, system-ui, sans-serif';
    ctx.fillText('Contas Abertas (Eixo Dir.)', width / 2 + 40, legY);

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
              Resultado diário & evolução de 7 dias
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
          isPrintMode ? 'lg:grid-cols-1 max-w-5xl mx-auto' : 'xl:grid-cols-12'
        } gap-6 items-start`}
      >
        {/* LEFT COLUMN: Daily Data Entry & Chart Controls (Hidden in Print Mode) */}
        {!isPrintMode && (
          <div className="xl:col-span-4 space-y-4">
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
                  <div className="flex items-center bg-[#101010] p-0.5 rounded-lg border border-[#222222]">
                    <button
                      type="button"
                      onClick={() => setMailingViewMode('padrao')}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        mailingViewMode === 'padrao'
                          ? 'bg-[#222222] text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Padrão
                    </button>
                    <button
                      type="button"
                      onClick={() => setMailingViewMode('grafico')}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                        mailingViewMode === 'grafico'
                          ? 'bg-[#222222] text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Gráfico
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1 truncate">
                      % Produtivo
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ex: 44.1"
                      value={produtividadeMailing}
                      onChange={e => setProdutividadeMailing(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-[#0D0D0D] border border-[#222222] text-sm font-bold text-white focus:outline-none focus:border-slate-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1 truncate">
                      % Improdutivo
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ex: 44.8"
                      value={improdutivos}
                      onChange={e => setImprodutivos(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-[#0D0D0D] border border-[#222222] text-sm font-bold text-white focus:outline-none focus:border-slate-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1 truncate">
                      % Atritado
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Ex: 11.1"
                      value={atritados}
                      onChange={e => setAtritados(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl bg-[#0D0D0D] border border-[#222222] text-sm font-bold text-white focus:outline-none focus:border-slate-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Chart Visual Controls */}
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
                    {useDualAxis ? 'Eixo Proporcional' : 'Escala Única'}
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

        {/* RIGHT COLUMN: Clean Borderless Dashboard Container (Only the cards themselves have borders) */}
        <div className={`${isPrintMode ? 'col-span-1' : 'xl:col-span-8'}`}>
          <div ref={captureCardRef} className="space-y-4">
            {/* Header Row */}
            <div className="flex items-center justify-between gap-3 px-1">
              <div>
                <h2 className="text-lg font-black text-white tracking-tight">
                  DASHBOARD SISCOM
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  Comparativo vs. média histórica
                </p>
              </div>

              <div className="px-3.5 py-1.5 rounded-xl bg-[#101010] border border-[#222222]">
                <span className="text-xs font-bold text-slate-200">
                  {activeRange.isSingleDay
                    ? formatBRDate(activeRange.start)
                    : `${formatBRDate(activeRange.start)} a ${formatBRDate(activeRange.end)}`}
                </span>
              </div>
            </div>

            {/* 3 Balanced KPI Cards in 2 : 3 : 2 proportion */}
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-3 items-stretch">
              {/* 1. TRANSFERÊNCIAS (2/7 width) */}
              <div className="lg:col-span-2 p-4 rounded-2xl bg-[#101010] border border-[#222222] flex flex-col justify-between space-y-3">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                  Transferências
                </span>

                <div className="grid grid-cols-2 gap-2.5 my-auto">
                  <div className="min-w-0">
                    <span className="text-[11px] text-slate-400 font-medium block truncate">
                      {activeRange.isSingleDay ? 'Total do Dia' : 'Total Período'}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1.5 whitespace-nowrap">
                      <span className="text-xl font-black text-white tracking-tight leading-none">
                        {displayedMetrics.totalTransferencias.toLocaleString('pt-BR')}
                      </span>
                      <MinimalDeltaBadge delta={deltas.transferencias} />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <span className="text-[11px] text-slate-400 font-medium block truncate">
                      Média / Hora
                    </span>
                    <div className="flex items-center gap-1.5 mt-1.5 whitespace-nowrap">
                      <span className="text-xl font-black text-white tracking-tight leading-none">
                        {displayedMetrics.mediaHora.toFixed(1).replace('.', ',')}
                      </span>
                      <MinimalDeltaBadge delta={deltas.mediaHora} />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. PRODUÇÃO (3/7 width) */}
              <div className="lg:col-span-3 p-4 rounded-2xl bg-[#101010] border border-[#222222] flex flex-col justify-between space-y-3">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                  Produção
                </span>

                <div className="grid grid-cols-3 gap-2.5 my-auto">
                  <div className="min-w-0">
                    <span className="text-[11px] text-slate-400 font-medium block truncate">
                      Leads Indicados
                    </span>
                    <div className="flex items-center gap-1.5 mt-1.5 whitespace-nowrap">
                      <span className="text-xl font-black text-white tracking-tight leading-none">
                        {displayedMetrics.leadsIndicados.toLocaleString('pt-BR')}
                      </span>
                      <MinimalDeltaBadge delta={deltas.leadsIndicados} />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <span className="text-[11px] text-slate-400 font-medium block truncate">
                      Contas Abertas
                    </span>
                    <div className="flex items-center gap-1.5 mt-1.5 whitespace-nowrap">
                      <span className="text-xl font-black text-white tracking-tight leading-none">
                        {displayedMetrics.contasAbertas.toLocaleString('pt-BR')}
                      </span>
                      <MinimalDeltaBadge delta={deltas.contasAbertas} />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <span className="text-[11px] text-slate-400 font-medium block truncate">
                      % Conversão
                    </span>
                    <div className="flex items-center gap-1.5 mt-1.5 whitespace-nowrap">
                      <span className="text-xl font-black text-white tracking-tight leading-none">
                        {displayedMetrics.conversaoPct.toFixed(1).replace('.', ',')}%
                      </span>
                      <MinimalDeltaBadge delta={deltas.conversaoPct} />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. MAILING (2/7 width) - Toggles between Padrão and Donut Chart */}
              <div className="lg:col-span-2 p-4 rounded-2xl bg-[#101010] border border-[#222222] flex flex-col justify-between space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
                    Mailing
                  </span>
                  {mailingViewMode === 'grafico' && (
                    <MinimalDeltaBadge delta={deltas.produtividadeMailing} />
                  )}
                </div>

                {mailingViewMode === 'padrao' ? (
                  <div className="grid grid-cols-2 gap-2.5 my-auto">
                    <div className="min-w-0">
                      <span className="text-[11px] text-slate-400 font-medium block truncate">
                        % Produtividade
                      </span>
                      <div className="flex items-center gap-1.5 mt-1.5 whitespace-nowrap">
                        <span className="text-xl font-black text-white tracking-tight leading-none">
                          {displayedMetrics.produtividadeMailing.toFixed(1).replace('.', ',')}%
                        </span>
                        <MinimalDeltaBadge delta={deltas.produtividadeMailing} />
                      </div>
                    </div>

                    <div className="min-w-0">
                      <span className="text-[11px] text-slate-400 font-medium block truncate">
                        % Atritados
                      </span>
                      <div className="flex items-center gap-1.5 mt-1.5 whitespace-nowrap">
                        <span className="text-xl font-black text-white tracking-tight leading-none">
                          {displayedMetrics.atritados.toFixed(1).replace('.', ',')}%
                        </span>
                        <MinimalDeltaBadge
                          delta={deltas.atritados}
                          invertColor={invertAtritadosColor}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-2 pt-0.5">
                    {/* Donut Chart with Produtivo % Visible in Center */}
                    <div className="relative w-28 h-28 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={mailingPieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={32}
                            outerRadius={50}
                            startAngle={90}
                            endAngle={-270}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="#101010"
                            strokeWidth={2}
                            isAnimationActive={false}
                          >
                            {mailingPieData.map((entry, idx) => (
                              <Cell key={`cell-${idx}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#101010',
                              borderColor: '#222222',
                              borderRadius: '8px',
                              color: '#FFFFFF',
                              fontSize: '11px'
                            }}
                            formatter={(_val: any, _name: any, props: any) => [
                              `${Number(props.payload.raw).toFixed(1).replace('.', ',')}%`,
                              props.payload.name
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-xs font-black text-white leading-none">
                          {displayedMetrics.produtividadeMailing.toFixed(1).replace('.', ',')}%
                        </span>
                      </div>
                    </div>

                    {/* Legend matching reference image */}
                    <div className="flex items-center justify-center gap-3 text-[10px] text-slate-300 font-medium whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: MAILING_COLORS.produtivo }}
                        />
                        Produtivo
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: MAILING_COLORS.improdutivo }}
                        />
                        Improdutivo
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span
                          className="w-2 h-2 rounded-full inline-block"
                          style={{ backgroundColor: MAILING_COLORS.atritado }}
                        />
                        Atritado
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 7-Day Comparative Evolution Chart Card */}
            <div className="p-5 rounded-2xl bg-[#101010] border border-[#222222] space-y-3">
              <div>
                <h3 className="text-xs font-extrabold text-slate-300 tracking-wider uppercase">
                  Evolução Últimos 7 Dias — Leads Indicados vs. Contas Abertas
                </h3>
              </div>

              <div className="h-60 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chart7DaysSeries}
                    margin={{ top: 22, right: 12, left: -16, bottom: 4 }}
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
                      domain={[0, (dataMax: number) => Math.max(10, Math.ceil(dataMax * 1.2))]}
                    />
                    {useDualAxis && (
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#525252"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: '#737373' }}
                        domain={[0, (dataMax: number) => Math.max(4, Math.ceil(dataMax * 1.35))]}
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
                      dot={{ r: 4, fill: '#FACC15', stroke: '#101010', strokeWidth: 1.5 }}
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
                      dot={{ r: 4, fill: '#E5E5E5', stroke: '#101010', strokeWidth: 1.5 }}
                      activeDot={{ r: 6, fill: '#FFFFFF' }}
                    >
                      {showPointLabels && (
                        <LabelList
                          dataKey="contasAbertas"
                          position="top"
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
                  <span className="font-semibold text-slate-300">
                    Leads Indicados {useDualAxis && <span className="text-slate-500 font-normal">(Eixo Esq.)</span>}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-neutral-200 inline-block" />
                  <span className="font-semibold text-slate-300">
                    Contas Abertas {useDualAxis && <span className="text-slate-500 font-normal">(Eixo Dir.)</span>}
                  </span>
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
 * Compact Pill Badge for % Delta Indicator (fits inline beside the number without wrapping)
 */
const MinimalDeltaBadge: React.FC<{
  delta: number | null;
  invertColor?: boolean;
}> = ({ delta, invertColor = false }) => {
  if (delta === null || isNaN(delta)) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold leading-none px-1.5 py-1 rounded-md bg-[#1F1F1F] text-slate-500 border border-[#2A2A2A]">
        <Minus className="w-2.5 h-2.5" /> 0%
      </span>
    );
  }

  const isNeutral = Math.abs(delta) < 0.05;
  const isUp = delta > 0;
  const isPositiveOutcome = invertColor ? !isUp : isUp;

  if (isNeutral) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold leading-none px-1.5 py-1 rounded-md bg-[#1F1F1F] text-slate-400 border border-[#2A2A2A]">
        <Minus className="w-2.5 h-2.5" /> 0%
      </span>
    );
  }

  const formattedPct =
    Math.abs(delta) >= 99.95
      ? `${Math.round(Math.abs(delta))}%`
      : `${Math.abs(delta).toFixed(1).replace('.', ',')}%`;

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[9.5px] font-bold leading-none px-1.5 py-1 rounded-md border ${
        isPositiveOutcome
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
      }`}
      title={`${isUp ? 'Acima' : 'Abaixo'} da média histórica`}
    >
      {isUp ? (
        <ArrowUpRight className="w-2.5 h-2.5 flex-shrink-0" />
      ) : (
        <ArrowDownRight className="w-2.5 h-2.5 flex-shrink-0" />
      )}
      <span>{formattedPct}</span>
    </span>
  );
};

function formatBRDate(yyyyMmDd: string): string {
  if (!yyyyMmDd) return '';
  const parts = yyyyMmDd.split('-');
  if (parts.length !== 3) return yyyyMmDd;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
