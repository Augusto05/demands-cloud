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
  EyeOff,
  Monitor,
  Smartphone,
  Clock,
  Plus
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
import { SiscomDailyRecord, SiscomStore, SiscomHourlyItem } from '../types';
import {
  getStoredSiscomStore,
  fetchSiscomStoreFromCloud,
  saveSiscomRecord,
  deleteSiscomRecord,
  calcMediaHora,
  calcConversaoPct,
  calcDeltaPct,
  computeSystemAverages,
  getLast7DaysChartSeries,
  isWeekend,
  computeChartAxes
} from '../services/siscomService';
import { formatDateToYYYYMMDD } from '../services/dataService';

type FilterMode = 'dia' | 'ontem' | '7dias' | 'mes' | 'custom';
type MailingViewMode = 'padrao' | 'grafico';
type DashboardLayout = 'desktop' | 'mobile';

const MAILING_COLORS = {
  produtivo: '#26D09B',
  improdutivo: '#F2445C',
  atritado: '#9F67FF'
};

export const SiscomDashboardView: React.FC = () => {
  const todayStr = useMemo(() => formatDateToYYYYMMDD(new Date()), []);
  const defaultDateStr = useMemo(() => {
    const d = new Date();
    while (d.getDay() === 0 || d.getDay() === 6) {
      d.setDate(d.getDate() - 1);
    }
    return formatDateToYYYYMMDD(d);
  }, []);

  // Store state synced with Supabase
  const [store, setStore] = useState<SiscomStore>(getStoredSiscomStore);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Selected Date for Daily Input / Editing (defaults to last business day)
  const [selectedDate, setSelectedDate] = useState<string>(defaultDateStr);

  // Filter Mode for Dashboard Visualization
  const [filterMode, setFilterMode] = useState<FilterMode>('dia');
  const [customStartDate, setCustomStartDate] = useState<string>(defaultDateStr);
  const [customEndDate, setCustomEndDate] = useState<string>(defaultDateStr);

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
  const [dashboardLayout, setDashboardLayout] = useState<DashboardLayout>('desktop');
  const [mailingViewMode, setMailingViewMode] = useState<MailingViewMode>('padrao');
  const [useDualAxis, setUseDualAxis] = useState<boolean>(true);
  const [showPointLabels, setShowPointLabels] = useState<boolean>(true);
  const [invertAtritadosColor, setInvertAtritadosColor] = useState<boolean>(true);
  const [copiedImage, setCopiedImage] = useState<boolean>(false);
  const [downloadingImage, setDownloadingImage] = useState<boolean>(false);

  // Hourly Breakdown State (Dynamic based on horasRodadas)
  const [hourlyItems, setHourlyItems] = useState<SiscomHourlyItem[]>([]);
  const [showHourlySection, setShowHourlySection] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('demands_siscom_show_hourly');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleHourlySection = () => {
    setShowHourlySection(prev => {
      const next = !prev;
      try {
        localStorage.setItem('demands_siscom_show_hourly', String(next));
      } catch {
        // ignore localStorage error
      }
      return next;
    });
  };

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

  // Helper to format hour label as "8h", "9h", etc.
  const formatHourDisplay = (label: string): string => {
    if (!label) return '';
    const match = label.match(/(\d{1,2})/);
    if (match) {
      return `${parseInt(match[1], 10)}h`;
    }
    return label;
  };

  // Default hour label generator (e.g. 8h, 9h, 10h)
  const getDefaultHourLabel = (index: number, startHour = 8): string => {
    const start = (startHour + index) % 24;
    return `${start}h`;
  };

  // Dynamic slot management helpers
  const handleHorasRodadasChange = (value: string) => {
    setHorasRodadas(value);
    const parsed = parseFloat(value.replace(',', '.')) || 0;
    const targetCount = Math.floor(parsed);
    if (targetCount > 0) {
      setHourlyItems(prev => {
        const next: SiscomHourlyItem[] = [];
        for (let i = 0; i < targetCount; i++) {
          if (prev[i]) {
            next.push({ ...prev[i], hourIndex: i });
          } else {
            next.push({
              hourIndex: i,
              hourLabel: getDefaultHourLabel(i),
              leadsIndicados: 0,
              contasAbertas: 0
            });
          }
        }
        return next;
      });
    }
  };

  const handleAddHourlySlot = () => {
    setHourlyItems(prev => [
      ...prev,
      {
        hourIndex: prev.length,
        hourLabel: getDefaultHourLabel(prev.length),
        leadsIndicados: 0,
        contasAbertas: 0
      }
    ]);
  };

  const handleRemoveHourlySlot = (index: number) => {
    setHourlyItems(prev =>
      prev
        .filter((_, i) => i !== index)
        .map((item, idx) => ({ ...item, hourIndex: idx }))
    );
  };

  const handleUpdateHourlySlot = (
    index: number,
    field: 'hourLabel' | 'leadsIndicados' | 'contasAbertas',
    val: any
  ) => {
    setHourlyItems(prev =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          [field]: field === 'hourLabel' ? String(val) : Math.max(0, parseInt(val, 10) || 0)
        };
      })
    );
  };

  const handleSyncTotalsFromHourly = () => {
    const sumLeads = hourlyItems.reduce((acc, h) => acc + (h.leadsIndicados || 0), 0);
    const sumContas = hourlyItems.reduce((acc, h) => acc + (h.contasAbertas || 0), 0);
    setLeadsIndicados(String(sumLeads));
    setContasAbertas(String(sumContas));
  };

  const handlePrepend8amSlot = () => {
    setHourlyItems(prev => [
      {
        hourIndex: 0,
        hourLabel: '8h',
        leadsIndicados: 0,
        contasAbertas: 0
      },
      ...prev.map((item, idx) => ({ ...item, hourIndex: idx + 1 }))
    ]);
  };

  const handleRealignSlotsFrom8am = () => {
    setHourlyItems(prev =>
      prev.map((item, idx) => ({
        ...item,
        hourIndex: idx,
        hourLabel: `${(8 + idx) % 24}h`
      }))
    );
  };

  const handleClearHourlyData = () => {
    if (window.confirm('Deseja limpar todos os lançamentos hora a hora deste dia?')) {
      setHourlyItems([]);
    }
  };

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

      if (existing.hourlyData && Array.isArray(existing.hourlyData) && existing.hourlyData.length > 0) {
        setHourlyItems(existing.hourlyData);
      } else if (existing.horasRodadas > 0) {
        const count = Math.floor(existing.horasRodadas);
        const slots: SiscomHourlyItem[] = [];
        for (let i = 0; i < count; i++) {
          slots.push({
            hourIndex: i,
            hourLabel: getDefaultHourLabel(i),
            leadsIndicados: 0,
            contasAbertas: 0
          });
        }
        setHourlyItems(slots);
      } else {
        setHourlyItems([]);
      }
    } else {
      setHorasRodadas('');
      setTotalTransferencias('');
      setLeadsIndicados('');
      setContasAbertas('');
      setProdutividadeMailing('');
      setImprodutivos('');
      setAtritados('');
      setHourlyItems([]);
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
      numAtritados > 0 ||
      hourlyItems.length > 0;

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
        hourlyData: hourlyItems,
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
    numAtritados,
    hourlyItems
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
        hourlyData: hourlyItems,
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
        setHourlyItems([]);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Date navigation helpers (skips weekends: Saturday & Sunday)
  const shiftSelectedDate = (daysDelta: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    dt.setDate(dt.getDate() + daysDelta);
    while (dt.getDay() === 0 || dt.getDay() === 6) {
      dt.setDate(dt.getDate() + (daysDelta >= 0 ? 1 : -1));
    }
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
      const prev = new Date(today);
      prev.setDate(prev.getDate() - 1);
      while (prev.getDay() === 0 || prev.getDay() === 6) {
        prev.setDate(prev.getDate() - 1);
      }
      const prevStr = formatDateToYYYYMMDD(prev);
      setSelectedDate(prevStr);
    } else if (mode === '7dias') {
      const d7 = new Date(today);
      d7.setDate(d7.getDate() - 6);
      setCustomStartDate(formatDateToYYYYMMDD(d7));
      setCustomEndDate(defaultDateStr);
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

  // Compute displayed metrics for activeRange (excluding weekends)
  const displayedMetrics = useMemo(() => {
    if (activeRange.isSingleDay) {
      const isWk = isWeekend(activeRange.start);
      const rec = isWk ? undefined : effectiveRecordsMap[activeRange.start];
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
        !isWeekend(r.date) &&
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

  // Harmonized proportional axes scales (prevents Contas line from floating above Leads)
  const chartAxes = useMemo(() => {
    return computeChartAxes(chart7DaysSeries, useDualAxis);
  }, [chart7DaysSeries, useDualAxis]);

  // Dynamic Hourly Breakdown Data for Active Period
  const displayedHourlyData = useMemo(() => {
    if (activeRange.isSingleDay) {
      const singleRec = effectiveRecordsMap[activeRange.start];
      return (singleRec?.hourlyData || []).map(h => ({
        ...h,
        hourLabel: formatHourDisplay(h.hourLabel)
      }));
    }

    // Multi-day filter: aggregate by hour slot across matching records in period
    const aggregationMap: Record<
      string,
      { hourLabel: string; leadsIndicados: number; contasAbertas: number; order: number }
    > = {};
    const matchingRecords = Object.values(effectiveRecordsMap).filter(
      r => r.date >= activeRange.start && r.date <= activeRange.end && !isWeekend(r.date)
    );

    matchingRecords.forEach(rec => {
      if (rec.hourlyData && Array.isArray(rec.hourlyData)) {
        rec.hourlyData.forEach(item => {
          const rawKey = (item.hourLabel || '').trim();
          const key = formatHourDisplay(rawKey);
          if (!key) return;
          if (!aggregationMap[key]) {
            aggregationMap[key] = {
              hourLabel: key,
              leadsIndicados: 0,
              contasAbertas: 0,
              order: item.hourIndex ?? 0
            };
          }
          aggregationMap[key].leadsIndicados += item.leadsIndicados || 0;
          aggregationMap[key].contasAbertas += item.contasAbertas || 0;
        });
      }
    });

    return Object.values(aggregationMap)
      .sort((a, b) => a.order - b.order)
      .map((item, idx) => ({
        hourIndex: idx,
        hourLabel: item.hourLabel,
        leadsIndicados: item.leadsIndicados,
        contasAbertas: item.contasAbertas
      }));
  }, [activeRange, effectiveRecordsMap]);

  // Hourly operational stats (identifies best conversion and peak hours)
  const hourlyStats = useMemo(() => {
    if (!displayedHourlyData || displayedHourlyData.length === 0) {
      return {
        hasData: false,
        totalLeads: 0,
        totalContas: 0,
        avgConversao: 0,
        bestConvHour: null as SiscomHourlyItem | null,
        bestContasHour: null as SiscomHourlyItem | null,
        peakLeadsHour: null as SiscomHourlyItem | null,
        maxHourlyLeads: 1
      };
    }

    const totalLeads = displayedHourlyData.reduce((acc, h) => acc + (h.leadsIndicados || 0), 0);
    const totalContas = displayedHourlyData.reduce((acc, h) => acc + (h.contasAbertas || 0), 0);
    const avgConversao = totalLeads > 0 ? (totalContas / totalLeads) * 100 : 0;
    const maxHourlyLeads = Math.max(1, ...displayedHourlyData.map(h => h.leadsIndicados || 0));

    let bestConvHour: SiscomHourlyItem | null = null;
    let highestConv = -1;
    let bestContasHour: SiscomHourlyItem | null = null;
    let maxContas = -1;
    let peakLeadsHour: SiscomHourlyItem | null = null;
    let maxLeads = -1;

    displayedHourlyData.forEach(h => {
      const conv = h.leadsIndicados > 0 ? (h.contasAbertas / h.leadsIndicados) * 100 : 0;
      if (h.leadsIndicados > 0 && conv > highestConv && h.contasAbertas > 0) {
        highestConv = conv;
        bestConvHour = h;
      }
      if (h.contasAbertas > maxContas && h.contasAbertas > 0) {
        maxContas = h.contasAbertas;
        bestContasHour = h;
      }
      if (h.leadsIndicados > maxLeads && h.leadsIndicados > 0) {
        maxLeads = h.leadsIndicados;
        peakLeadsHour = h;
      }
    });

    return {
      hasData: totalLeads > 0 || totalContas > 0,
      totalLeads,
      totalContas,
      avgConversao,
      bestConvHour,
      bestContasHour,
      peakLeadsHour,
      maxHourlyLeads
    };
  }, [displayedHourlyData]);

  // Sorted list of stored dates for quick history access (weekdays only)
  const historyList = useMemo(() => {
    return Object.values(store.records)
      .filter(
        r =>
          !isWeekend(r.date) &&
          (r.totalTransferencias > 0 ||
            r.leadsIndicados > 0 ||
            r.contasAbertas > 0 ||
            r.produtividadeMailing > 0 ||
            (r.improdutivos || 0) > 0 ||
            r.atritados > 0)
      )
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [store.records]);

  // Render Clean Neutral Desktop PNG Canvas
  const generateDesktopCanvas = (): HTMLCanvasElement => {
    const scale = 2;
    const width = 920;
    const isDonut = mailingViewMode === 'grafico';
    const topBoxH = isDonut ? 162 : 146;
    const topY = 72;

    const hasHourly = showHourlySection && hourlyStats.hasData && displayedHourlyData.length > 0;
    const hourlyRowH = 30;
    const hourlyBoxH = hasHourly ? 52 + 24 + displayedHourlyData.length * hourlyRowH + 34 : 0;
    const chartBoxY = hasHourly ? topY + topBoxH + 14 + hourlyBoxH + 14 : topY + topBoxH + 14;
    const chartBoxH = 236;
    const height = chartBoxY + chartBoxH + 24;

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
    ctx.fillText('Dia atual vs. média histórica', padX, 55);

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

    // Helper for compact pill badge below value
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

      ctx.font = '700 10px Inter, system-ui, sans-serif';
      const tw = ctx.measureText(txt).width + 12;
      const th = 18;
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
      ctx.fillText(txt, x + 6, y - 1);
    };

    // 3 Section Blocks in 2 : 3 : 2 proportion
    const gap = 12;
    const availW = totalInnerW - gap * 2;
    const col1W = Math.floor((availW * 2) / 7);
    const col2W = Math.floor((availW * 3) / 7);
    const col3W = availW - col1W - col2W;

    const col1X = padX;
    const col2X = col1X + col1W + gap;
    const col3X = col2X + col2W + gap;

    const innerCardTop = topY + 38;
    const innerCardH = topBoxH - 50;

    const drawMetricBox = (
      x: number,
      _w: number,
      label: string,
      valueStr: string,
      delta: number | null,
      invert = false
    ) => {
      ctx.fillStyle = '#94A3B8';
      ctx.font = '600 11px Inter, system-ui, sans-serif';
      ctx.fillText(label, x + 2, innerCardTop + 18);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 30px Inter, system-ui, sans-serif';
      const centerValY = innerCardTop + Math.floor(innerCardH / 2) + 8;
      ctx.fillText(valueStr, x + 2, centerValY);

      drawDeltaPill(x + 2, innerCardTop + innerCardH - 8, delta, invert);
    };

    // --- BLOCK 1: TRANSFERÊNCIAS ---
    roundRect(col1X, topY, col1W, topBoxH, 12);
    ctx.fillStyle = '#101010';
    ctx.fill();
    ctx.strokeStyle = '#222222';
    ctx.stroke();

    ctx.fillStyle = '#E2E8F0';
    ctx.font = '800 13px Inter, system-ui, sans-serif';
    ctx.fillText('TRANSFERÊNCIAS', col1X + 14, topY + 24);

    const slot1Gap = 8;
    const slot1W = Math.floor((col1W - 28 - slot1Gap) / 2);
    drawMetricBox(
      col1X + 14,
      slot1W,
      activeRange.isSingleDay ? 'Total do Dia' : 'Total Período',
      displayedMetrics.totalTransferencias.toLocaleString('pt-BR'),
      deltas.transferencias
    );
    drawMetricBox(
      col1X + 14 + slot1W + slot1Gap,
      slot1W,
      'Média / Hora',
      displayedMetrics.mediaHora.toFixed(1).replace('.', ','),
      deltas.mediaHora
    );

    // --- BLOCK 2: PRODUÇÃO ---
    roundRect(col2X, topY, col2W, topBoxH, 12);
    ctx.fillStyle = '#101010';
    ctx.fill();
    ctx.strokeStyle = '#222222';
    ctx.stroke();

    ctx.fillStyle = '#E2E8F0';
    ctx.font = '800 13px Inter, system-ui, sans-serif';
    ctx.fillText('PRODUÇÃO', col2X + 14, topY + 24);

    const slot2Gap = 8;
    const slot2W = Math.floor((col2W - 28 - slot2Gap * 2) / 3);
    drawMetricBox(
      col2X + 14,
      slot2W,
      'Leads Indicados',
      displayedMetrics.leadsIndicados.toLocaleString('pt-BR'),
      deltas.leadsIndicados
    );
    drawMetricBox(
      col2X + 14 + slot2W + slot2Gap,
      slot2W,
      'Contas Abertas',
      displayedMetrics.contasAbertas.toLocaleString('pt-BR'),
      deltas.contasAbertas
    );
    drawMetricBox(
      col2X + 14 + (slot2W + slot2Gap) * 2,
      slot2W,
      '% Conversão',
      `${displayedMetrics.conversaoPct.toFixed(1).replace('.', ',')}%`,
      deltas.conversaoPct
    );

    // --- BLOCK 3: MAILING ---
    roundRect(col3X, topY, col3W, topBoxH, 12);
    ctx.fillStyle = '#101010';
    ctx.fill();
    ctx.strokeStyle = '#222222';
    ctx.stroke();

    ctx.fillStyle = '#E2E8F0';
    ctx.font = '800 13px Inter, system-ui, sans-serif';
    ctx.fillText('MAILING', col3X + 14, topY + 24);

    if (!isDonut) {
      const slot3Gap = 8;
      const slot3W = Math.floor((col3W - 28 - slot3Gap) / 2);
      drawMetricBox(
        col3X + 14,
        slot3W,
        '% Produtividade',
        `${displayedMetrics.produtividadeMailing.toFixed(1).replace('.', ',')}%`,
        deltas.produtividadeMailing
      );
      drawMetricBox(
        col3X + 14 + slot3W + slot3Gap,
        slot3W,
        '% Atritados',
        `${displayedMetrics.atritados.toFixed(1).replace('.', ',')}%`,
        deltas.atritados,
        invertAtritadosColor
      );
    } else {
      drawDeltaPill(col3X + col3W - 64, topY + 22, deltas.produtividadeMailing);

      const legItems = [
        { label: 'Produtivo', color: MAILING_COLORS.produtivo },
        { label: 'Improdutivo', color: MAILING_COLORS.improdutivo },
        { label: 'Atritado', color: MAILING_COLORS.atritado }
      ];
      const dotR = 4;
      const dotTextGap = 7;
      const rowStep = 22;
      const startLegY = topY + 72;
      const legX = col3X + 16;

      ctx.font = '500 11px Inter, system-ui, sans-serif';
      legItems.forEach((item, idx) => {
        const ly = startLegY + idx * rowStep;
        ctx.beginPath();
        ctx.arc(legX + dotR, ly - 3.5, dotR, 0, Math.PI * 2);
        ctx.fillStyle = item.color;
        ctx.fill();

        ctx.fillStyle = '#CBD5E1';
        ctx.textAlign = 'left';
        ctx.fillText(item.label, legX + dotR * 2 + dotTextGap, ly);
      });

      const outerR = 46;
      const innerR = 29;
      const centerX = col3X + col3W - outerR - 20;
      const centerY = topY + 94;

      const totalPie = mailingPieData.reduce((s, d) => s + d.value, 0);
      let currentAngle = -Math.PI / 2;

      mailingPieData.forEach(slice => {
        const sliceAngle = (slice.value / Math.max(1, totalPie)) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerR, currentAngle, currentAngle + sliceAngle);
        ctx.arc(centerX, centerY, innerR, currentAngle + sliceAngle, currentAngle, true);
        ctx.closePath();
        ctx.fillStyle = slice.color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#101010';
        ctx.stroke();
        currentAngle += sliceAngle;
      });
    }

    // --- HOURLY BREAKDOWN BOX (IF ACTIVE) ---
    if (hasHourly) {
      const hourlyBoxY = topY + topBoxH + 14;
      roundRect(padX, hourlyBoxY, totalInnerW, hourlyBoxH, 12);
      ctx.fillStyle = '#141414';
      ctx.fill();
      ctx.strokeStyle = '#222222';
      ctx.stroke();

      ctx.fillStyle = '#D4D4D4';
      ctx.font = '800 12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('OPERAÇÃO HORA A HORA', padX + 18, hourlyBoxY + 26);

      ctx.strokeStyle = '#1E1E1E';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padX + 20, hourlyBoxY + 38);
      ctx.lineTo(padX + totalInnerW - 20, hourlyBoxY + 38);
      ctx.stroke();

      const col1X = padX + 22;
      const col2Center = padX + 270;
      const col3Center = padX + 475;
      const col4Center = padX + 680;
      const col5Center = padX + 865;
      const rightEdge = padX + totalInnerW - 20;

      const headerTop = hourlyBoxY + 38;
      const headerH = 28;
      const headerMid = headerTop + headerH / 2;

      ctx.textBaseline = 'middle';
      ctx.font = '700 11px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#737373';
      ctx.textAlign = 'left';
      ctx.fillText('HORÁRIO', col1X, headerMid);
      ctx.textAlign = 'center';
      ctx.fillText('LEADS INDICADOS', col2Center, headerMid);
      ctx.fillText('CONTAS ABERTAS', col3Center, headerMid);
      ctx.fillText('% CONVERSÃO', col4Center, headerMid);
      ctx.fillText('DESTAQUE', col5Center, headerMid);

      let curRowTop = headerTop + headerH;
      ctx.strokeStyle = '#282828';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(col1X, curRowTop);
      ctx.lineTo(rightEdge, curRowTop);
      ctx.stroke();

      displayedHourlyData.forEach(item => {
        const rowMid = curRowTop + hourlyRowH / 2;

        // Hour Label (8h, 9h, etc.)
        ctx.font = '700 13px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#E5E5E5';
        ctx.textAlign = 'left';
        ctx.fillText(formatHourDisplay(item.hourLabel), col1X, rowMid);

        // Leads Indicados
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(item.leadsIndicados.toLocaleString('pt-BR'), col2Center, rowMid);

        // Contas Abertas
        ctx.font = '800 13px Inter, system-ui, sans-serif';
        ctx.fillStyle = item.contasAbertas > 0 ? '#26D09B' : '#737373';
        ctx.textAlign = 'center';
        ctx.fillText(item.contasAbertas.toLocaleString('pt-BR'), col3Center, rowMid);

        // % Conversão Pill
        const conv =
          item.leadsIndicados > 0 ? (item.contasAbertas / item.leadsIndicados) * 100 : 0;
        const convText = `${conv.toFixed(1).replace('.', ',')}%`;
        ctx.font = '800 12px Inter, system-ui, sans-serif';
        const tw = ctx.measureText(convText).width;
        const pillW = tw + 14;
        const pillH = 20;
        if (conv >= (hourlyStats.avgConversao || 10) && conv > 0) {
          roundRect(col4Center - pillW / 2, rowMid - pillH / 2, pillW, pillH, 5);
          ctx.fillStyle = 'rgba(38, 208, 155, 0.15)';
          ctx.fill();
          ctx.fillStyle = '#26D09B';
        } else {
          ctx.fillStyle = conv > 0 ? '#E2E8F0' : '#737373';
        }
        ctx.textAlign = 'center';
        ctx.fillText(convText, col4Center, rowMid);

        // Destaque Badge
        const isBestConv =
          hourlyStats.bestConvHour?.hourIndex === item.hourIndex && item.contasAbertas > 0;
        const isPeakLeads =
          hourlyStats.peakLeadsHour?.hourIndex === item.hourIndex && item.leadsIndicados > 0;
        if (isBestConv) {
          const bText = 'Maior Conv.';
          ctx.font = '800 10px Inter, system-ui, sans-serif';
          const bw = ctx.measureText(bText).width + 12;
          const badgeH = 18;
          roundRect(col5Center - bw / 2, rowMid - badgeH / 2, bw, badgeH, 4);
          ctx.fillStyle = 'rgba(38, 208, 155, 0.20)';
          ctx.fill();
          ctx.fillStyle = '#26D09B';
          ctx.textAlign = 'center';
          ctx.fillText(bText, col5Center, rowMid);
        } else if (isPeakLeads) {
          const bText = 'Pico Leads';
          ctx.font = '800 10px Inter, system-ui, sans-serif';
          const bw = ctx.measureText(bText).width + 12;
          const badgeH = 18;
          roundRect(col5Center - bw / 2, rowMid - badgeH / 2, bw, badgeH, 4);
          ctx.fillStyle = 'rgba(250, 204, 21, 0.20)';
          ctx.fill();
          ctx.fillStyle = '#FACC15';
          ctx.textAlign = 'center';
          ctx.fillText(bText, col5Center, rowMid);
        } else {
          ctx.font = '600 11px Inter, system-ui, sans-serif';
          ctx.fillStyle = '#525252';
          ctx.textAlign = 'center';
          ctx.fillText('—', col5Center, rowMid);
        }

        curRowTop += hourlyRowH;
        ctx.strokeStyle = '#242424';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(col1X, curRowTop);
        ctx.lineTo(rightEdge, curRowTop);
        ctx.stroke();
      });

      // Totals Footer Row
      const totaisH = 32;
      const totaisMid = curRowTop + totaisH / 2;

      ctx.strokeStyle = '#2A2A2A';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(col1X, curRowTop);
      ctx.lineTo(rightEdge, curRowTop);
      ctx.stroke();

      ctx.font = '800 11px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#A3A3A3';
      ctx.textAlign = 'left';
      ctx.fillText('TOTAIS', col1X, totaisMid);

      ctx.font = '800 13px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(hourlyStats.totalLeads.toLocaleString('pt-BR'), col2Center, totaisMid);

      ctx.fillStyle = '#26D09B';
      ctx.fillText(hourlyStats.totalContas.toLocaleString('pt-BR'), col3Center, totaisMid);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`${hourlyStats.avgConversao.toFixed(1).replace('.', ',')}%`, col4Center, totaisMid);

      ctx.font = '600 11px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#737373';
      ctx.fillText(`${displayedHourlyData.length} faixas`, col5Center, totaisMid);

      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
    }

    // --- CHART BOX (LAST 7 DAYS) ---
    roundRect(padX, chartBoxY, totalInnerW, chartBoxH, 12);
    ctx.fillStyle = '#141414';
    ctx.fill();
    ctx.strokeStyle = '#222222';
    ctx.stroke();

    ctx.fillStyle = '#D4D4D4';
    ctx.font = '700 11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      'EVOLUÇÃO ÚLTIMOS 7 DIAS ÚTEIS — LEADS INDICADOS VS. CONTAS ABERTAS',
      padX + 16,
      chartBoxY + 26
    );

    const plotLeft = padX + 20;
    const plotRight = width - padX - 20;
    const plotTop = chartBoxY + 50;
    const plotBottom = chartBoxY + chartBoxH - 48;
    const plotW = plotRight - plotLeft;
    const plotH = plotBottom - plotTop;

    const { leadsAxisMax, contasAxisMax, singleAxisMax } = chartAxes;

    // Subtle horizontal grid lines (clean indicator style without axis numbers)
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = plotBottom - (plotH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(plotLeft, y);
      ctx.lineTo(plotRight, y);
      ctx.stroke();
    }
    ctx.textAlign = 'left';

    const stepX = plotW / Math.max(1, chart7DaysSeries.length - 1);

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

    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    leadsPts.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

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
        ctx.fillText(String(p.val), p.x, p.y + 16);
      }
    });

    const chartLegItems = [
      {
        label: 'Leads Indicados',
        color: '#FACC15'
      },
      {
        label: 'Contas Abertas',
        color: '#E5E5E5'
      }
    ];
    const legY = chartBoxY + chartBoxH - 14;
    ctx.font = '600 11px Inter, system-ui, sans-serif';
    const cDotR = 4;
    const cDotTextGap = 6;
    const cItemGap = 28;
    const cItemWidths = chartLegItems.map(
      it => cDotR * 2 + cDotTextGap + ctx.measureText(it.label).width
    );
    const totalChartLegW =
      cItemWidths.reduce((s, w) => s + w, 0) + cItemGap * (chartLegItems.length - 1);
    let curChartLegX = width / 2 - totalChartLegW / 2;

    chartLegItems.forEach((item, idx) => {
      ctx.beginPath();
      ctx.arc(curChartLegX + cDotR, legY - 3.5, cDotR, 0, Math.PI * 2);
      ctx.fillStyle = item.color;
      ctx.fill();

      ctx.fillStyle = '#D4D4D4';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, curChartLegX + cDotR * 2 + cDotTextGap, legY);
      curChartLegX += cItemWidths[idx] + cItemGap;
    });

    return canvas;
  };

  // Render Balanced & Compact Mobile PNG Canvas (Width 580px, Row 1: Transferências + Mailing 50/50, Row 2: Produção 100%, Row 3: Gráfico)
  const generateMobileCanvas = (): HTMLCanvasElement => {
    const scale = 2;
    const width = 580;
    const isDonut = mailingViewMode === 'grafico';
    const padX = 16;
    const innerW = width - padX * 2; // 548px
    const gap = 10;

    const row1H = 138;
    const row2H = 132;
    const chartBoxH = 238;

    const topY = 74;
    const row2Top = topY + row1H + gap;
    const hasHourly = showHourlySection && hourlyStats.hasData && displayedHourlyData.length > 0;
    const hourlyRowH = 30;
    const hourlyBoxH = hasHourly ? 52 + 24 + displayedHourlyData.length * hourlyRowH + 34 : 0;
    const hourlyBoxY = row2Top + row2H + gap;
    const chartBoxY = hasHourly ? hourlyBoxY + hourlyBoxH + gap : row2Top + row2H + gap;
    const height = chartBoxY + chartBoxH + 18;

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

    // Dark Background
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, width, height);

    // Header
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 18px Inter, system-ui, sans-serif';
    ctx.fillText('DASHBOARD SISCOM', padX, 36);

    ctx.fillStyle = '#737373';
    ctx.font = '500 11px Inter, system-ui, sans-serif';
    ctx.fillText('Dia atual vs. média histórica', padX, 54);

    // Date Badge on Right
    const periodLabel = activeRange.isSingleDay
      ? formatBRDate(activeRange.start)
      : `${formatBRDate(activeRange.start)} a ${formatBRDate(activeRange.end)}`;
    ctx.font = '700 11.5px Inter, system-ui, sans-serif';
    const badgeW = ctx.measureText(periodLabel).width + 22;
    roundRect(width - padX - badgeW, 25, badgeW, 28, 8);
    ctx.fillStyle = '#141414';
    ctx.fill();
    ctx.strokeStyle = '#222222';
    ctx.stroke();

    ctx.fillStyle = '#E5E5E5';
    ctx.fillText(periodLabel, width - padX - badgeW + 11, 43);

    // Delta Pill Helper
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

      ctx.font = '700 10.5px Inter, system-ui, sans-serif';
      const tw = ctx.measureText(txt).width + 12;
      const th = 19;
      roundRect(x, y - 14, tw, th, 6);

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
      ctx.fillText(txt, x + 6, y);
    };

    // --- ROW 1: CARD 1 (TRANSFERÊNCIAS, 50% WIDTH) & CARD 2 (MAILING, 50% WIDTH) ---
    const row1CardW = Math.floor((innerW - gap) / 2); // 269px
    const card2Left = padX + row1CardW + gap;

    // CARD 1: TRANSFERÊNCIAS
    roundRect(padX, topY, row1CardW, row1H, 14);
    ctx.fillStyle = '#101010';
    ctx.fill();
    ctx.strokeStyle = '#222222';
    ctx.stroke();

    ctx.fillStyle = '#E2E8F0';
    ctx.font = '800 12.5px Inter, system-ui, sans-serif';
    ctx.fillText('TRANSFERÊNCIAS', padX + 14, topY + 23);

    const slot1W = Math.floor((row1CardW - 28 - 10) / 2);

    // Total do Dia
    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 11px Inter, system-ui, sans-serif';
    ctx.fillText(
      activeRange.isSingleDay ? 'Total do Dia' : 'Total Período',
      padX + 14,
      topY + 47
    );
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 32px Inter, system-ui, sans-serif';
    ctx.fillText(
      displayedMetrics.totalTransferencias.toLocaleString('pt-BR'),
      padX + 14,
      topY + 84
    );
    drawDeltaPill(padX + 14, topY + 114, deltas.transferencias);

    // Média / Hora
    const col1_2X = padX + 14 + slot1W + 10;
    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 11px Inter, system-ui, sans-serif';
    ctx.fillText('Média / Hora', col1_2X, topY + 47);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 32px Inter, system-ui, sans-serif';
    ctx.fillText(
      displayedMetrics.mediaHora.toFixed(1).replace('.', ','),
      col1_2X,
      topY + 84
    );
    drawDeltaPill(col1_2X, topY + 114, deltas.mediaHora);

    // CARD 2: MAILING
    roundRect(card2Left, topY, row1CardW, row1H, 14);
    ctx.fillStyle = '#101010';
    ctx.fill();
    ctx.strokeStyle = '#222222';
    ctx.stroke();

    ctx.fillStyle = '#E2E8F0';
    ctx.font = '800 12.5px Inter, system-ui, sans-serif';
    ctx.fillText('MAILING', card2Left + 14, topY + 23);

    if (!isDonut) {
      const slot2W = Math.floor((row1CardW - 28 - 10) / 2);

      // % Produtividade
      ctx.fillStyle = '#94A3B8';
      ctx.font = '600 11px Inter, system-ui, sans-serif';
      ctx.fillText('% Produtividade', card2Left + 14, topY + 47);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 32px Inter, system-ui, sans-serif';
      ctx.fillText(
        `${displayedMetrics.produtividadeMailing.toFixed(1).replace('.', ',')}%`,
        card2Left + 14,
        topY + 84
      );
      drawDeltaPill(card2Left + 14, topY + 114, deltas.produtividadeMailing);

      // % Atritados
      const col2_2X = card2Left + 14 + slot2W + 10;
      ctx.fillStyle = '#94A3B8';
      ctx.font = '600 11px Inter, system-ui, sans-serif';
      ctx.fillText('% Atritados', col2_2X, topY + 47);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 32px Inter, system-ui, sans-serif';
      ctx.fillText(
        `${displayedMetrics.atritados.toFixed(1).replace('.', ',')}%`,
        col2_2X,
        topY + 84
      );
      drawDeltaPill(col2_2X, topY + 114, deltas.atritados, invertAtritadosColor);
    } else {
      drawDeltaPill(card2Left + row1CardW - 74, topY + 21, deltas.produtividadeMailing);

      const prodVal = `${displayedMetrics.produtividadeMailing.toFixed(1).replace('.', ',')}%`;
      const improdVal = `${displayedMetrics.improdutivos.toFixed(1).replace('.', ',')}%`;
      const atritVal = `${displayedMetrics.atritados.toFixed(1).replace('.', ',')}%`;

      const legItems = [
        { label: 'Produtivo', val: prodVal, color: MAILING_COLORS.produtivo },
        { label: 'Improdutivo', val: improdVal, color: MAILING_COLORS.improdutivo },
        { label: 'Atritado', val: atritVal, color: MAILING_COLORS.atritado }
      ];
      const dotR = 4.5;
      const dotTextGap = 7;
      const rowStep = 26;
      const startLegY = topY + 54;
      const legX = card2Left + 14;

      legItems.forEach((item, idx) => {
        const ly = startLegY + idx * rowStep;
        ctx.beginPath();
        ctx.arc(legX + dotR, ly - 3.5, dotR, 0, Math.PI * 2);
        ctx.fillStyle = item.color;
        ctx.fill();

        ctx.font = '600 11px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#CBD5E1';
        ctx.textAlign = 'left';
        ctx.fillText(item.label, legX + dotR * 2 + dotTextGap, ly);

        ctx.font = '800 11px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`: ${item.val}`, legX + dotR * 2 + dotTextGap + ctx.measureText(item.label).width, ly);
      });

      // Donut Chart on Right Side
      const outerR = 42;
      const innerR = 26;
      const centerX = card2Left + row1CardW - outerR - 14;
      const centerY = topY + 76;

      const totalPie = mailingPieData.reduce((s, d) => s + d.value, 0);
      let currentAngle = -Math.PI / 2;

      mailingPieData.forEach(slice => {
        const sliceAngle = (slice.value / Math.max(1, totalPie)) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerR, currentAngle, currentAngle + sliceAngle);
        ctx.arc(centerX, centerY, innerR, currentAngle + sliceAngle, currentAngle, true);
        ctx.closePath();
        ctx.fillStyle = slice.color;
        ctx.fill();
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = '#101010';
        ctx.stroke();
        currentAngle += sliceAngle;
      });
    }

    // --- ROW 2: CARD 3 (PRODUÇÃO, 100% WIDTH) ---
    roundRect(padX, row2Top, innerW, row2H, 14);
    ctx.fillStyle = '#101010';
    ctx.fill();
    ctx.strokeStyle = '#222222';
    ctx.stroke();

    ctx.fillStyle = '#E2E8F0';
    ctx.font = '800 12.5px Inter, system-ui, sans-serif';
    ctx.fillText('PRODUÇÃO', padX + 16, row2Top + 23);

    const slot3Gap = 12;
    const slot3W = Math.floor((innerW - 32 - slot3Gap * 2) / 3);

    // Leads Indicados
    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 11px Inter, system-ui, sans-serif';
    ctx.fillText('Leads Indicados', padX + 16, row2Top + 47);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 30px Inter, system-ui, sans-serif';
    ctx.fillText(
      displayedMetrics.leadsIndicados.toLocaleString('pt-BR'),
      padX + 16,
      row2Top + 84
    );
    drawDeltaPill(padX + 16, row2Top + 112, deltas.leadsIndicados);

    // Contas Abertas
    const col3_2X = padX + 16 + slot3W + slot3Gap;
    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 11px Inter, system-ui, sans-serif';
    ctx.fillText('Contas Abertas', col3_2X, row2Top + 47);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 30px Inter, system-ui, sans-serif';
    ctx.fillText(
      displayedMetrics.contasAbertas.toLocaleString('pt-BR'),
      col3_2X,
      row2Top + 84
    );
    drawDeltaPill(col3_2X, row2Top + 112, deltas.contasAbertas);

    // % Conversão
    const col3_3X = padX + 16 + (slot3W + slot3Gap) * 2;
    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 11px Inter, system-ui, sans-serif';
    ctx.fillText('% Conversão', col3_3X, row2Top + 47);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 30px Inter, system-ui, sans-serif';
    ctx.fillText(
      `${displayedMetrics.conversaoPct.toFixed(1).replace('.', ',')}%`,
      col3_3X,
      row2Top + 84
    );
    drawDeltaPill(col3_3X, row2Top + 112, deltas.conversaoPct);

    // --- HOURLY BREAKDOWN BOX (IF ACTIVE) ---
    if (hasHourly) {
      roundRect(padX, hourlyBoxY, innerW, hourlyBoxH, 14);
      ctx.fillStyle = '#101010';
      ctx.fill();
      ctx.strokeStyle = '#222222';
      ctx.stroke();

      ctx.fillStyle = '#D4D4D4';
      ctx.font = '800 12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('OPERAÇÃO HORA A HORA', padX + 16, hourlyBoxY + 24);

      ctx.strokeStyle = '#1E1E1E';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padX + 16, hourlyBoxY + 36);
      ctx.lineTo(padX + innerW - 16, hourlyBoxY + 36);
      ctx.stroke();

      // 5 Columns: Horário, Leads, Contas, % Conv, Destaque
      const col1X = padX + 16;
      const col2Center = padX + 130;
      const col3Center = padX + 222;
      const col4Center = padX + 316;
      const col5Center = padX + 412;
      const rightEdge = padX + innerW - 16;

      const headerTop = hourlyBoxY + 36;
      const headerH = 28;
      const headerMid = headerTop + headerH / 2;

      ctx.textBaseline = 'middle';
      ctx.font = '700 10px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#737373';
      ctx.textAlign = 'left';
      ctx.fillText('HORÁRIO', col1X, headerMid);
      ctx.textAlign = 'center';
      ctx.fillText('LEADS', col2Center, headerMid);
      ctx.fillText('CONTAS', col3Center, headerMid);
      ctx.fillText('% CONV.', col4Center, headerMid);
      ctx.fillText('DESTAQUE', col5Center, headerMid);

      let curRowTop = headerTop + headerH;
      ctx.strokeStyle = '#282828';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(col1X, curRowTop);
      ctx.lineTo(rightEdge, curRowTop);
      ctx.stroke();

      displayedHourlyData.forEach(item => {
        const rowMid = curRowTop + hourlyRowH / 2;

        // Hour Label (8h, 9h, etc.)
        ctx.font = '700 13px Inter, system-ui, sans-serif';
        ctx.fillStyle = '#E5E5E5';
        ctx.textAlign = 'left';
        ctx.fillText(formatHourDisplay(item.hourLabel), col1X, rowMid);

        // Leads
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(item.leadsIndicados.toLocaleString('pt-BR'), col2Center, rowMid);

        // Contas
        ctx.font = '800 13px Inter, system-ui, sans-serif';
        ctx.fillStyle = item.contasAbertas > 0 ? '#26D09B' : '#737373';
        ctx.textAlign = 'center';
        ctx.fillText(item.contasAbertas.toLocaleString('pt-BR'), col3Center, rowMid);

        // % Conversão Pill
        const conv =
          item.leadsIndicados > 0 ? (item.contasAbertas / item.leadsIndicados) * 100 : 0;
        const convText = `${conv.toFixed(1).replace('.', ',')}%`;
        ctx.font = '800 12px Inter, system-ui, sans-serif';
        const tw = ctx.measureText(convText).width;
        const pillW = tw + 12;
        const pillH = 20;
        if (conv >= (hourlyStats.avgConversao || 10) && conv > 0) {
          roundRect(col4Center - pillW / 2, rowMid - pillH / 2, pillW, pillH, 5);
          ctx.fillStyle = 'rgba(38, 208, 155, 0.15)';
          ctx.fill();
          ctx.fillStyle = '#26D09B';
        } else {
          ctx.fillStyle = conv > 0 ? '#E2E8F0' : '#737373';
        }
        ctx.textAlign = 'center';
        ctx.fillText(convText, col4Center, rowMid);

        // Destaque Badge
        const isBestConv =
          hourlyStats.bestConvHour?.hourIndex === item.hourIndex && item.contasAbertas > 0;
        const isPeakLeads =
          hourlyStats.peakLeadsHour?.hourIndex === item.hourIndex && item.leadsIndicados > 0;
        if (isBestConv) {
          const bText = 'Maior Conv.';
          ctx.font = '800 10px Inter, system-ui, sans-serif';
          const bw = ctx.measureText(bText).width + 10;
          const badgeH = 18;
          roundRect(col5Center - bw / 2, rowMid - badgeH / 2, bw, badgeH, 4);
          ctx.fillStyle = 'rgba(38, 208, 155, 0.20)';
          ctx.fill();
          ctx.fillStyle = '#26D09B';
          ctx.textAlign = 'center';
          ctx.fillText(bText, col5Center, rowMid);
        } else if (isPeakLeads) {
          const bText = 'Pico Leads';
          ctx.font = '800 10px Inter, system-ui, sans-serif';
          const bw = ctx.measureText(bText).width + 10;
          const badgeH = 18;
          roundRect(col5Center - bw / 2, rowMid - badgeH / 2, bw, badgeH, 4);
          ctx.fillStyle = 'rgba(250, 204, 21, 0.20)';
          ctx.fill();
          ctx.fillStyle = '#FACC15';
          ctx.textAlign = 'center';
          ctx.fillText(bText, col5Center, rowMid);
        } else {
          ctx.font = '600 11px Inter, system-ui, sans-serif';
          ctx.fillStyle = '#525252';
          ctx.textAlign = 'center';
          ctx.fillText('—', col5Center, rowMid);
        }

        curRowTop += hourlyRowH;
        ctx.strokeStyle = '#242424';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(col1X, curRowTop);
        ctx.lineTo(rightEdge, curRowTop);
        ctx.stroke();
      });

      // Totals
      const totaisH = 32;
      const totaisMid = curRowTop + totaisH / 2;

      ctx.strokeStyle = '#2A2A2A';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(col1X, curRowTop);
      ctx.lineTo(rightEdge, curRowTop);
      ctx.stroke();

      ctx.font = '800 11px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#A3A3A3';
      ctx.textAlign = 'left';
      ctx.fillText('TOTAIS', col1X, totaisMid);

      ctx.font = '800 13px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText(hourlyStats.totalLeads.toLocaleString('pt-BR'), col2Center, totaisMid);

      ctx.fillStyle = '#26D09B';
      ctx.fillText(hourlyStats.totalContas.toLocaleString('pt-BR'), col3Center, totaisMid);

      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`${hourlyStats.avgConversao.toFixed(1).replace('.', ',')}%`, col4Center, totaisMid);

      ctx.font = '600 11px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#737373';
      ctx.fillText(`${displayedHourlyData.length} faixas`, col5Center, totaisMid);

      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
    }

    // --- ROW 3: CARD 4 (CHART BOX, LAST 7 DAYS) ---
    roundRect(padX, chartBoxY, innerW, chartBoxH, 14);
    ctx.fillStyle = '#101010';
    ctx.fill();
    ctx.strokeStyle = '#222222';
    ctx.stroke();

    ctx.fillStyle = '#D4D4D4';
    ctx.font = '700 11px Inter, system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      'EVOLUÇÃO ÚLTIMOS 7 DIAS ÚTEIS — LEADS INDICADOS VS. CONTAS ABERTAS',
      padX + 16,
      chartBoxY + 23
    );

    const plotLeft = padX + 18;
    const plotRight = width - padX - 18;
    const plotTop = chartBoxY + 44;
    const plotBottom = chartBoxY + chartBoxH - 42;
    const plotW = plotRight - plotLeft;
    const plotH = plotBottom - plotTop;

    const { leadsAxisMax, contasAxisMax, singleAxisMax } = chartAxes;

    // Subtle horizontal grid lines (clean indicator style without axis numbers)
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = plotBottom - (plotH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(plotLeft, y);
      ctx.lineTo(plotRight, y);
      ctx.stroke();
    }
    ctx.textAlign = 'left';

    const stepX = plotW / Math.max(1, chart7DaysSeries.length - 1);

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

    // Date X-Axis labels
    leadsPts.forEach(p => {
      ctx.fillStyle = '#737373';
      ctx.font = '600 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(p.label, p.x, plotBottom + 16);
    });

    // Stroke Leads (Yellow)
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    leadsPts.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // Stroke Contas (White)
    ctx.strokeStyle = '#E5E5E5';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    contasPts.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // Draw Dots & Collision-free point labels
    leadsPts.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#FACC15';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#101010';
      ctx.stroke();

      if (showPointLabels) {
        const contasP = contasPts[i];
        let leadsLabelY = p.y - 8;
        if (p.y >= plotBottom - 16 && contasP && contasP.y >= plotBottom - 16) {
          leadsLabelY = p.y - 18;
        }
        ctx.fillStyle = '#FACC15';
        ctx.font = '700 10.5px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(p.val), p.x, leadsLabelY);
      }
    });

    contasPts.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#E5E5E5';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#101010';
      ctx.stroke();

      if (showPointLabels) {
        const isNearBottom = p.y >= plotBottom - 16;
        const contasLabelY = isNearBottom ? p.y - 7 : p.y + 15;

        ctx.fillStyle = '#E5E5E5';
        ctx.font = '700 10.5px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(p.val), p.x, contasLabelY);
      }
    });

    // Chart Legend at the bottom
    const chartLegItems = [
      {
        label: 'Leads Indicados',
        color: '#FACC15'
      },
      {
        label: 'Contas Abertas',
        color: '#E5E5E5'
      }
    ];
    const legY = chartBoxY + chartBoxH - 12;
    ctx.font = '600 11px Inter, system-ui, sans-serif';
    const cDotR = 4;
    const cDotTextGap = 6;
    const cItemGap = 20;
    const cItemWidths = chartLegItems.map(
      it => cDotR * 2 + cDotTextGap + ctx.measureText(it.label).width
    );
    const totalChartLegW =
      cItemWidths.reduce((s, w) => s + w, 0) + cItemGap * (chartLegItems.length - 1);
    let curChartLegX = width / 2 - totalChartLegW / 2;

    chartLegItems.forEach((item, idx) => {
      ctx.beginPath();
      ctx.arc(curChartLegX + cDotR, legY - 3.5, cDotR, 0, Math.PI * 2);
      ctx.fillStyle = item.color;
      ctx.fill();

      ctx.fillStyle = '#D4D4D4';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, curChartLegX + cDotR * 2 + cDotTextGap, legY);
      curChartLegX += cItemWidths[idx] + cItemGap;
    });

    return canvas;
  };

  // Generate either Desktop or Mobile canvas based on selected layout
  const generateDashboardCanvas = (): HTMLCanvasElement => {
    return dashboardLayout === 'mobile'
      ? generateMobileCanvas()
      : generateDesktopCanvas();
  };

  const handleDownloadPNG = () => {
    setDownloadingImage(true);
    try {
      const canvas = generateDashboardCanvas();
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download =
        dashboardLayout === 'mobile'
          ? `dashboard-siscom-mobile-${activeRange.start}.png`
          : `dashboard-siscom-${activeRange.start}.png`;
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

        {/* Right: Layout Switcher, Export & Print Mode Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Layout Mode Switcher (Desktop vs Mobile) */}
          <div className="flex items-center bg-[#161616] p-1 rounded-xl border border-[#222222]">
            <button
              type="button"
              onClick={() => setDashboardLayout('desktop')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                dashboardLayout === 'desktop'
                  ? 'bg-[#222222] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Layout Horizontal (Desktop)"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setDashboardLayout('mobile')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                dashboardLayout === 'mobile'
                  ? 'bg-[#222222] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Layout Vertical com Fontes Maiores (Mobile)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile</span>
            </button>
          </div>

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
            <span>{dashboardLayout === 'mobile' ? 'Baixar PNG Mobile' : 'Baixar PNG'}</span>
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
                      onChange={e => handleHorasRodadasChange(e.target.value)}
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

              {/* SECTION 2.1: HORA A HORA (DINÂMICO) */}
              <div className="p-3.5 rounded-xl bg-[#161616] border border-[#222222] space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[#FACC15]" />
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300">
                      Operação Hora a Hora
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hourlyItems.length > 0 && (
                      <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                        {hourlyItems.length} {hourlyItems.length === 1 ? 'faixa' : 'faixas'}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={toggleHourlySection}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                        showHourlySection
                          ? 'bg-[#181818] border-[#2E2E2E] text-slate-300 hover:text-white hover:border-slate-500'
                          : 'bg-amber-400/10 border-amber-400/30 text-amber-300 hover:bg-amber-400/20'
                      }`}
                      title={showHourlySection ? 'Ocultar visão na Dashboard' : 'Exibir visão na Dashboard'}
                    >
                      {showHourlySection ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                          <span>Ocultar visão</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5 text-[#26D09B]" />
                          <span>Exibir visão</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {hourlyItems.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                      <div className="col-span-4">Horário</div>
                      <div className="col-span-3 text-center">Leads</div>
                      <div className="col-span-2 text-center">Contas</div>
                      <div className="col-span-2 text-right">Conv.</div>
                      <div className="col-span-1"></div>
                    </div>

                    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                      {hourlyItems.map((item, idx) => {
                        const itemConv =
                          item.leadsIndicados > 0
                            ? (item.contasAbertas / item.leadsIndicados) * 100
                            : 0;
                        return (
                          <div
                            key={idx}
                            className="grid grid-cols-12 gap-1.5 items-center bg-[#0D0D0D] p-1.5 rounded-xl border border-[#222222]"
                          >
                            <div className="col-span-4">
                              <input
                                type="text"
                                value={item.hourLabel}
                                onChange={e =>
                                  handleUpdateHourlySlot(idx, 'hourLabel', e.target.value)
                                }
                                className="w-full bg-transparent text-xs font-bold text-slate-200 focus:outline-none focus:text-white"
                                placeholder="08h - 09h"
                              />
                            </div>
                            <div className="col-span-3">
                              <input
                                type="number"
                                min="0"
                                value={item.leadsIndicados || ''}
                                onChange={e =>
                                  handleUpdateHourlySlot(idx, 'leadsIndicados', e.target.value)
                                }
                                placeholder="0"
                                className="w-full px-1.5 py-1 text-center bg-[#161616] border border-[#262626] rounded-lg text-xs font-bold text-white focus:outline-none focus:border-slate-500"
                              />
                            </div>
                            <div className="col-span-2">
                              <input
                                type="number"
                                min="0"
                                value={item.contasAbertas || ''}
                                onChange={e =>
                                  handleUpdateHourlySlot(idx, 'contasAbertas', e.target.value)
                                }
                                placeholder="0"
                                className="w-full px-1.5 py-1 text-center bg-[#161616] border border-[#262626] rounded-lg text-xs font-bold text-[#26D09B] focus:outline-none focus:border-[#26D09B]"
                              />
                            </div>
                            <div className="col-span-2 text-right">
                              <span
                                className={`text-[10px] font-bold ${
                                  itemConv > 0 ? 'text-[#26D09B]' : 'text-slate-600'
                                }`}
                              >
                                {itemConv > 0 ? `${itemConv.toFixed(0)}%` : '0%'}
                              </span>
                            </div>
                            <div className="col-span-1 flex items-center justify-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveHourlySlot(idx)}
                                className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 transition-colors cursor-pointer"
                                title="Excluir este horário"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Action buttons below slots */}
                    <div className="pt-2 flex flex-col gap-2 border-t border-[#222222]">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleAddHourlySlot}
                            className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white cursor-pointer transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5 text-[#FACC15]" />
                            Mais 1 hora
                          </button>

                          {!hourlyItems.some(
                            h =>
                              (h.hourLabel || '').includes('08h') ||
                              (h.hourLabel || '').includes('8h')
                          ) && (
                            <button
                              type="button"
                              onClick={handlePrepend8amSlot}
                              className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-[#FACC15]/10 text-amber-300 hover:bg-[#FACC15]/20 border border-[#FACC15]/30 cursor-pointer transition-colors"
                              title="Inserir faixa das 08h às 09h no topo"
                            >
                              <Plus className="w-3 h-3" />
                              Inserir 08h
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleClearHourlyData}
                            className="flex items-center gap-1 text-[11px] font-semibold text-rose-400/80 hover:text-rose-400 cursor-pointer transition-colors"
                            title="Remover todos os horários deste dia"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Limpar
                          </button>

                          <button
                            type="button"
                            onClick={handleSyncTotalsFromHourly}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#26D09B]/10 hover:bg-[#26D09B]/20 text-[#26D09B] border border-[#26D09B]/30 text-[11px] font-bold transition-all cursor-pointer"
                            title="Preencher os campos de Produção com a soma do detalhamento hora a hora"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Copiar soma p/ totais
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <button
                          type="button"
                          onClick={handleRealignSlotsFrom8am}
                          className="text-slate-400 hover:text-slate-200 underline cursor-pointer"
                          title="Reorganizar as faixas para começarem em 08h"
                        >
                          Reajustar nomes das faixas (início 08h)
                        </button>
                        <span>
                          Soma:{' '}
                          <strong className="text-white">
                            {hourlyItems.reduce((acc, h) => acc + (h.leadsIndicados || 0), 0)} leads
                          </strong>
                          ,{' '}
                          <strong className="text-[#26D09B]">
                            {hourlyItems.reduce((acc, h) => acc + (h.contasAbertas || 0), 0)} contas
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[#0D0D0D] border border-dashed border-[#262626] text-center space-y-2">
                    <p className="text-[11px] text-slate-400">
                      Nenhum horário cadastrado para este dia.
                    </p>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          const count = numHoras > 0 ? Math.floor(numHoras) : 8;
                          const slots: SiscomHourlyItem[] = [];
                          for (let i = 0; i < count; i++) {
                            slots.push({
                              hourIndex: i,
                              hourLabel: getDefaultHourLabel(i, 8),
                              leadsIndicados: 0,
                              contasAbertas: 0
                            });
                          }
                          setHourlyItems(slots);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#202020] hover:bg-[#2A2A2A] text-amber-300 hover:text-amber-200 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#FACC15]" />
                        Gerar faixas (a partir das 08h)
                      </button>
                      <button
                        type="button"
                        onClick={handleAddHourlySlot}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#161616] hover:bg-[#202020] border border-[#2A2A2A] text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar 1 faixa
                      </button>
                    </div>
                  </div>
                )}
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
          <div
            ref={captureCardRef}
            className={`space-y-4 ${
              dashboardLayout === 'mobile' ? 'max-w-xl mx-auto' : ''
            }`}
          >
            {/* Header Row */}
            <div className="flex items-center justify-between gap-3 px-1">
              <div>
                <h2 className="text-lg font-black text-white tracking-tight">
                  DASHBOARD SISCOM
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  Dia atual vs. média histórica
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

            {/* KPI Cards: Dynamic Desktop (3 columns) vs Mobile (multi-row vertical with large fonts) */}
            {dashboardLayout === 'desktop' ? (
              <div className="grid grid-cols-1 lg:grid-cols-7 gap-3 items-stretch">
                {/* 1. TRANSFERÊNCIAS (2/7 width) */}
                <div className="lg:col-span-2 p-4 rounded-2xl bg-[#101010] border border-[#222222] flex flex-col gap-3">
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-200 block">
                    Transferências
                  </span>

                  <div className="grid grid-cols-2 gap-3 flex-1">
                    <div className="min-w-0 py-1.5 flex flex-col justify-between items-start">
                      <span className="text-[11px] text-slate-400 font-semibold block truncate">
                        {activeRange.isSingleDay ? 'Total do Dia' : 'Total Período'}
                      </span>
                      <span className="text-3xl font-black text-white tracking-tight leading-none my-2">
                        {displayedMetrics.totalTransferencias.toLocaleString('pt-BR')}
                      </span>
                      <MinimalDeltaBadge delta={deltas.transferencias} />
                    </div>

                    <div className="min-w-0 py-1.5 flex flex-col justify-between items-start">
                      <span className="text-[11px] text-slate-400 font-semibold block truncate">
                        Média / Hora
                      </span>
                      <span className="text-3xl font-black text-white tracking-tight leading-none my-2">
                        {displayedMetrics.mediaHora.toFixed(1).replace('.', ',')}
                      </span>
                      <MinimalDeltaBadge delta={deltas.mediaHora} />
                    </div>
                  </div>
                </div>

                {/* 2. PRODUÇÃO (3/7 width) */}
                <div className="lg:col-span-3 p-4 rounded-2xl bg-[#101010] border border-[#222222] flex flex-col gap-3">
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-200 block">
                    Produção
                  </span>

                  <div className="grid grid-cols-3 gap-3 flex-1">
                    <div className="min-w-0 py-1.5 flex flex-col justify-between items-start">
                      <span className="text-[11px] text-slate-400 font-semibold block truncate">
                        Leads Indicados
                      </span>
                      <span className="text-3xl font-black text-white tracking-tight leading-none my-2">
                        {displayedMetrics.leadsIndicados.toLocaleString('pt-BR')}
                      </span>
                      <MinimalDeltaBadge delta={deltas.leadsIndicados} />
                    </div>

                    <div className="min-w-0 py-1.5 flex flex-col justify-between items-start">
                      <span className="text-[11px] text-slate-400 font-semibold block truncate">
                        Contas Abertas
                      </span>
                      <span className="text-3xl font-black text-white tracking-tight leading-none my-2">
                        {displayedMetrics.contasAbertas.toLocaleString('pt-BR')}
                      </span>
                      <MinimalDeltaBadge delta={deltas.contasAbertas} />
                    </div>

                    <div className="min-w-0 py-1.5 flex flex-col justify-between items-start">
                      <span className="text-[11px] text-slate-400 font-semibold block truncate">
                        % Conversão
                      </span>
                      <span className="text-3xl font-black text-white tracking-tight leading-none my-2">
                        {displayedMetrics.conversaoPct.toFixed(1).replace('.', ',')}%
                      </span>
                      <MinimalDeltaBadge delta={deltas.conversaoPct} />
                    </div>
                  </div>
                </div>

                {/* 3. MAILING (2/7 width) - Toggles between Padrão and Donut Chart */}
                <div className="lg:col-span-2 p-4 rounded-2xl bg-[#101010] border border-[#222222] flex flex-col gap-3 justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-200 block">
                      Mailing
                    </span>
                    {mailingViewMode === 'grafico' && (
                      <MinimalDeltaBadge delta={deltas.produtividadeMailing} />
                    )}
                  </div>

                  {mailingViewMode === 'padrao' ? (
                    <div className="grid grid-cols-2 gap-3 flex-1">
                      <div className="min-w-0 py-1.5 flex flex-col justify-between items-start">
                        <span className="text-[11px] text-slate-400 font-semibold block truncate">
                          % Produtividade
                        </span>
                        <span className="text-3xl font-black text-white tracking-tight leading-none my-2">
                          {displayedMetrics.produtividadeMailing.toFixed(1).replace('.', ',')}%
                        </span>
                        <MinimalDeltaBadge delta={deltas.produtividadeMailing} />
                      </div>

                      <div className="min-w-0 py-1.5 flex flex-col justify-between items-start">
                        <span className="text-[11px] text-slate-400 font-semibold block truncate">
                          % Atritados
                        </span>
                        <span className="text-3xl font-black text-white tracking-tight leading-none my-2">
                          {displayedMetrics.atritados.toFixed(1).replace('.', ',')}%
                        </span>
                        <MinimalDeltaBadge
                          delta={deltas.atritados}
                          invertColor={invertAtritadosColor}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 flex-1">
                      {/* Left Side: Vertical Legend */}
                      <div className="flex flex-col justify-center gap-2.5 text-[11px] text-slate-300 font-medium whitespace-nowrap">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: MAILING_COLORS.produtivo }}
                          />
                          Produtivo
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: MAILING_COLORS.improdutivo }}
                          />
                          Improdutivo
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: MAILING_COLORS.atritado }}
                          />
                          Atritado
                        </span>
                      </div>

                      {/* Right Side: Donut Chart with Produtivo % Visible in Center */}
                      <div className="relative w-28 h-28 flex items-center justify-center flex-shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={mailingPieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={33}
                              outerRadius={51}
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
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* MOBILE LAYOUT: Balanced & Compact (Row 1: Transferências + Mailing 50/50, Row 2: Produção 100%) */
              <div className="space-y-3">
                {/* ROW 1: TRANSFERÊNCIAS (50%) + MAILING (50%) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
                  {/* 1. TRANSFERÊNCIAS */}
                  <div className="p-4 rounded-2xl bg-[#101010] border border-[#222222] flex flex-col justify-between gap-3">
                    <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-200 block">
                      Transferências
                    </span>

                    <div className="grid grid-cols-2 gap-3 flex-1">
                      <div className="min-w-0 py-1 flex flex-col justify-between items-start">
                        <span className="text-[11px] text-slate-400 font-semibold block truncate">
                          {activeRange.isSingleDay ? 'Total do Dia' : 'Total Período'}
                        </span>
                        <span className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none my-1.5">
                          {displayedMetrics.totalTransferencias.toLocaleString('pt-BR')}
                        </span>
                        <MinimalDeltaBadge delta={deltas.transferencias} />
                      </div>

                      <div className="min-w-0 py-1 flex flex-col justify-between items-start">
                        <span className="text-[11px] text-slate-400 font-semibold block truncate">
                          Média / Hora
                        </span>
                        <span className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none my-1.5">
                          {displayedMetrics.mediaHora.toFixed(1).replace('.', ',')}
                        </span>
                        <MinimalDeltaBadge delta={deltas.mediaHora} />
                      </div>
                    </div>
                  </div>

                  {/* 2. MAILING */}
                  <div className="p-4 rounded-2xl bg-[#101010] border border-[#222222] flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-200 block">
                        Mailing
                      </span>
                      {mailingViewMode === 'grafico' && (
                        <MinimalDeltaBadge delta={deltas.produtividadeMailing} />
                      )}
                    </div>

                    {mailingViewMode === 'padrao' ? (
                      <div className="grid grid-cols-2 gap-3 flex-1">
                        <div className="min-w-0 py-1 flex flex-col justify-between items-start">
                          <span className="text-[11px] text-slate-400 font-semibold block truncate">
                            % Produtividade
                          </span>
                          <span className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none my-1.5">
                            {displayedMetrics.produtividadeMailing.toFixed(1).replace('.', ',')}%
                          </span>
                          <MinimalDeltaBadge delta={deltas.produtividadeMailing} />
                        </div>

                        <div className="min-w-0 py-1 flex flex-col justify-between items-start">
                          <span className="text-[11px] text-slate-400 font-semibold block truncate">
                            % Atritados
                          </span>
                          <span className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none my-1.5">
                            {displayedMetrics.atritados.toFixed(1).replace('.', ',')}%
                          </span>
                          <MinimalDeltaBadge
                            delta={deltas.atritados}
                            invertColor={invertAtritadosColor}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2 flex-1">
                        {/* Left Side: Legend with explicit percentages */}
                        <div className="flex flex-col justify-center gap-2 text-[11px] text-slate-300 font-medium whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: MAILING_COLORS.produtivo }}
                            />
                            Produtivo: <strong className="text-white font-bold">{displayedMetrics.produtividadeMailing.toFixed(1).replace('.', ',')}%</strong>
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: MAILING_COLORS.improdutivo }}
                            />
                            Improdutivo: <strong className="text-white font-bold">{displayedMetrics.improdutivos.toFixed(1).replace('.', ',')}%</strong>
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: MAILING_COLORS.atritado }}
                            />
                            Atritado: <strong className="text-white font-bold">{displayedMetrics.atritados.toFixed(1).replace('.', ',')}%</strong>
                          </span>
                        </div>

                        {/* Right Side: Donut Chart with Produtivo % in Center */}
                        <div className="relative w-24 h-24 flex items-center justify-center flex-shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={mailingPieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={28}
                                outerRadius={44}
                                startAngle={90}
                                endAngle={-270}
                                paddingAngle={2}
                                dataKey="value"
                                stroke="#101010"
                                strokeWidth={2}
                                isAnimationActive={false}
                              >
                                {mailingPieData.map((entry, idx) => (
                                  <Cell key={`cell-mob-${idx}`} fill={entry.color} />
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
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ROW 2: PRODUÇÃO (100% WIDTH, 3 BALANCED COLUMNS) */}
                <div className="p-4 rounded-2xl bg-[#101010] border border-[#222222] flex flex-col gap-3">
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-200 block">
                    Produção
                  </span>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="min-w-0 py-1 flex flex-col justify-between items-start">
                      <span className="text-[11px] text-slate-400 font-semibold block truncate">
                        Leads Indicados
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none my-1.5">
                        {displayedMetrics.leadsIndicados.toLocaleString('pt-BR')}
                      </span>
                      <MinimalDeltaBadge delta={deltas.leadsIndicados} />
                    </div>

                    <div className="min-w-0 py-1 flex flex-col justify-between items-start">
                      <span className="text-[11px] text-slate-400 font-semibold block truncate">
                        Contas Abertas
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none my-1.5">
                        {displayedMetrics.contasAbertas.toLocaleString('pt-BR')}
                      </span>
                      <MinimalDeltaBadge delta={deltas.contasAbertas} />
                    </div>

                    <div className="min-w-0 py-1 flex flex-col justify-between items-start">
                      <span className="text-[11px] text-slate-400 font-semibold block truncate">
                        % Conversão
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none my-1.5">
                        {displayedMetrics.conversaoPct.toFixed(1).replace('.', ',')}%
                      </span>
                      <MinimalDeltaBadge delta={deltas.conversaoPct} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* HOURLY BREAKDOWN VIEW (OPERAÇÃO HORA A HORA) */}
            {showHourlySection && (
              <div className="p-5 rounded-2xl bg-[#101010] border border-[#222222] space-y-4">
                {/* Header with Title */}
                <div className="pb-3 border-b border-[#1E1E1E]">
                  <h3 className="text-xs font-extrabold text-slate-300 tracking-wider uppercase">
                    Operação Hora a Hora
                  </h3>
                </div>

                {/* Minimalist Hourly Table */}
                {hourlyStats.hasData ? (
                  <div className="overflow-x-auto rounded-xl border border-[#222222]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-[#282828] bg-[#141414] text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                          <th className="py-3 px-3.5">Horário</th>
                          <th className="py-3 px-3.5 text-center">Leads Indicados</th>
                          <th className="py-3 px-3.5 text-center">Contas Abertas</th>
                          <th className="py-3 px-3.5 text-center">% Conversão</th>
                          <th className="py-3 px-3.5 text-center">Destaque</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#242424]">
                        {displayedHourlyData.map((item, idx) => {
                          const conv =
                            item.leadsIndicados > 0
                              ? (item.contasAbertas / item.leadsIndicados) * 100
                              : 0;
                          const isBestConv =
                            hourlyStats.bestConvHour?.hourIndex === item.hourIndex &&
                            item.contasAbertas > 0;
                          const isPeakLeads =
                            hourlyStats.peakLeadsHour?.hourIndex === item.hourIndex &&
                            item.leadsIndicados > 0;

                          return (
                            <tr
                              key={idx}
                              className={`hover:bg-[#181818] transition-colors ${
                                isBestConv
                                  ? 'bg-[#26D09B]/5'
                                  : idx % 2 === 1
                                  ? 'bg-[#121212]/40'
                                  : ''
                              }`}
                            >
                              <td className="py-3 px-3.5 font-semibold text-slate-200 align-middle">
                                <span className="inline-flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#525252]" />
                                  {formatHourDisplay(item.hourLabel)}
                                </span>
                              </td>
                              <td className="py-3 px-3.5 text-center font-bold text-white tracking-tight align-middle">
                                {item.leadsIndicados.toLocaleString('pt-BR')}
                              </td>
                              <td className="py-3 px-3.5 text-center font-extrabold text-white tracking-tight align-middle">
                                <span
                                  className={
                                    item.contasAbertas > 0 ? 'text-[#26D09B]' : 'text-slate-500'
                                  }
                                >
                                  {item.contasAbertas.toLocaleString('pt-BR')}
                                </span>
                              </td>
                              <td className="py-3 px-3.5 text-center align-middle">
                                <span
                                  className={`inline-block font-black px-2.5 py-1 rounded-md ${
                                    conv >= (hourlyStats.avgConversao || 10) && conv > 0
                                      ? 'bg-[#26D09B]/15 text-[#26D09B]'
                                      : conv > 0
                                      ? 'text-slate-200'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  {conv.toFixed(1).replace('.', ',')}%
                                </span>
                              </td>
                              <td className="py-3 px-3.5 text-center align-middle">
                                {isBestConv ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#26D09B]/20 text-[#26D09B] text-[10px] font-black uppercase">
                                    Maior Conv.
                                  </span>
                                ) : isPeakLeads ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#FACC15]/20 text-[#FACC15] text-[10px] font-black uppercase">
                                    Pico Leads
                                  </span>
                                ) : (
                                  <span className="text-slate-600 font-mono text-[11px]">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-[#2A2A2A] bg-[#141414] font-black text-slate-200">
                          <td className="py-3 px-3.5 uppercase text-[11px] tracking-wider text-slate-400 align-middle">
                            Totais
                          </td>
                          <td className="py-3 px-3.5 text-center text-white font-bold align-middle">
                            {hourlyStats.totalLeads.toLocaleString('pt-BR')}
                          </td>
                          <td className="py-3 px-3.5 text-center text-[#26D09B] font-black align-middle">
                            {hourlyStats.totalContas.toLocaleString('pt-BR')}
                          </td>
                          <td className="py-3 px-3.5 text-center text-white font-black align-middle">
                            {hourlyStats.avgConversao.toFixed(1).replace('.', ',')}%
                          </td>
                          <td className="py-3 px-3.5 text-center text-[10px] text-slate-400 font-medium align-middle">
                            {displayedHourlyData.length} faixas
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="py-6 px-4 rounded-xl bg-[#0D0D0D] border border-dashed border-[#222222] text-center space-y-1.5">
                    <p className="text-xs font-semibold text-slate-300">
                      Nenhum detalhamento hora a hora registrado para este dia
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                      Preencha as horas rodadas no formulário de lançamento diário para gerar os campos e acompanhar a conversão por faixa de horário.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 7-Day Comparative Evolution Chart Card */}
            <div className="p-5 rounded-2xl bg-[#101010] border border-[#222222] space-y-3">
              <div>
                <h3 className="text-xs font-extrabold text-slate-300 tracking-wider uppercase">
                  Evolução Últimos 7 Dias Úteis — Leads Indicados vs. Contas Abertas
                </h3>
              </div>

              <div className="h-60 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chart7DaysSeries}
                    margin={{ top: 22, right: 14, left: 14, bottom: 4 }}
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
                      hide={true}
                      domain={[0, chartAxes.leadsAxisMax]}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      hide={true}
                      domain={[0, chartAxes.contasAxisMax]}
                    />
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
                  <span className="font-semibold text-slate-300">
                    Leads Indicados
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-neutral-200 inline-block" />
                  <span className="font-semibold text-slate-300">
                    Contas Abertas
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
