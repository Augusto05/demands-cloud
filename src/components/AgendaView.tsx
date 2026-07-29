import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Clock, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Filter, 
  ExternalLink, 
  RefreshCw, 
  Link, 
  MapPin, 
  Tag, 
  LayoutList,
  Sparkles,
  Settings,
  X,
  CheckSquare,
  Square,
  FileText,
  Upload,
  Trash2
} from 'lucide-react';
import { KanbanCard, KanbanColumn, KanbanStore } from '../types';
import { getStoredKanban, saveStoredKanban } from '../services/kanbanService';
import { 
  CalendarEvent, 
  GoogleCalendarFeed, 
  getStoredFeeds, 
  saveStoredFeeds, 
  getStoredPastedEvents,
  saveStoredPastedEvents,
  getStoredUrlFeedCache,
  saveStoredUrlFeedCache,
  getAllStoredGoogleEvents,
  fetchGoogleCalendarFeed,
  parseICSContent,
  cleanEvent
} from '../services/googleCalendarService';
import { KanbanCardModal } from './KanbanCardModal';

interface AgendaViewProps {
  onNavigateTab?: (tab: string) => void;
}

export const AgendaView: React.FC<AgendaViewProps> = ({ onNavigateTab }) => {
  // Navigation & View State
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');

  // Filter toggles
  const [showGoogleEvents, setShowGoogleEvents] = useState<boolean>(true);
  const [showKanbanEvents, setShowKanbanEvents] = useState<boolean>(true);

  // Data State
  const [kanbanStore, setKanbanStore] = useState<KanbanStore>(getStoredKanban());
  const [feeds, setFeeds] = useState<GoogleCalendarFeed[]>(getStoredFeeds());
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>(getAllStoredGoogleEvents());

  // Modal State
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [editingKanbanCard, setEditingKanbanCard] = useState<KanbanCard | null>(null);
  const [newFeedName, setNewFeedName] = useState<string>('');
  const [newFeedUrl, setNewFeedUrl] = useState<string>('');
  const [pastedICS, setPastedICS] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [feedStatusMsg, setFeedStatusMsg] = useState<string | null>(null);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState<boolean>(false);
  const [isMobileHeaderExpanded, setIsMobileHeaderExpanded] = useState<boolean>(false);

  // Load feeds & sync Google Calendar events on mount
  useEffect(() => {
    refreshAllFeeds();
  }, []);

  // Sync Google feeds
  const refreshAllFeeds = async (currentFeeds = feeds) => {
    setIsRefreshing(true);
    setFeedStatusMsg(null);

    const activeFeeds = currentFeeds.filter(f => f.enabled && f.url && f.url.trim().length > 0);
    let allFetched: CalendarEvent[] = [];

    for (const feed of activeFeeds) {
      const events = await fetchGoogleCalendarFeed(feed);
      if (events.length > 0) {
        allFetched = [...allFetched, ...events];
      }
    }

    // Cache fetched URL feed events separately
    saveStoredUrlFeedCache(allFetched);

    // Merge uploaded events with URL feed events
    const uploaded = getStoredPastedEvents();
    const mergedAll = [...uploaded, ...allFetched];
    setGoogleEvents(mergedAll);

    if (activeFeeds.length === 0) {
      if (uploaded.length > 0) {
        setFeedStatusMsg(`Exibindo ${uploaded.length} eventos do arquivo .ics importado. (Nenhum link URL ativo)`);
      } else {
        setFeedStatusMsg('Nenhum link URL ou arquivo .ics configurado.');
      }
    } else if (allFetched.length > 0) {
      setFeedStatusMsg(`Sincronizado! ${allFetched.length} eventos carregados do Google Agenda.`);
    } else {
      setFeedStatusMsg('O link público informou 0 eventos ou bloqueio de privacidade do Google.');
    }

    setIsRefreshing(false);
  };

  // Convert Kanban cards with due dates into CalendarEvents
  const kanbanEvents: CalendarEvent[] = useMemo(() => {
    const store = getStoredKanban();
    const result: CalendarEvent[] = [];

    store.cards.forEach((card: KanbanCard) => {
      if (!card.dueDate) return;

      const column = store.columns.find((c: KanbanColumn) => c.id === card.columnId);
      const isCompleted = card.columnId === 'col-feito';

      result.push({
        id: `k-${card.id}`,
        title: card.title,
        description: card.description || card.subtitle,
        start: card.dueDate,
        allDay: true,
        calendarName: 'Kanban de Demandas',
        color: column ? column.color : '#FACC15',
        source: 'kanban',
        kanbanCardId: card.id,
        kanbanColumnId: card.columnId,
        completed: isCompleted
      });
    });

    return result;
  }, [kanbanStore]);

  // Combine all active events
  const combinedEvents: CalendarEvent[] = useMemo(() => {
    const list: CalendarEvent[] = [];
    if (showGoogleEvents) list.push(...googleEvents.map(cleanEvent));
    if (showKanbanEvents) list.push(...kanbanEvents);
    return list;
  }, [googleEvents, kanbanEvents, showGoogleEvents, showKanbanEvents]);

  // Date Formatting Helpers
  const formatDateYYYYMMDD = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = formatDateYYYYMMDD(new Date());
  const selectedDateStr = formatDateYYYYMMDD(currentDate);

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'day') next.setDate(next.getDate() - 1);
    else if (viewMode === 'week') next.setDate(next.getDate() - 7);
    else if (viewMode === 'month') next.setMonth(next.getMonth() - 1);
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'day') next.setDate(next.getDate() + 1);
    else if (viewMode === 'week') next.setDate(next.getDate() + 7);
    else if (viewMode === 'month') next.setMonth(next.getMonth() + 1);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Toggle Kanban Card Completion (moves card to column 'col-feito' or back to 'col-afazer')
  const toggleKanbanCompletion = (cardId?: string) => {
    if (!cardId) return;
    const store = getStoredKanban();
    const updatedCards = store.cards.map((c: KanbanCard) => {
      if (c.id === cardId) {
        const nextCol = c.columnId === 'col-feito' ? 'col-afazer' : 'col-feito';
        return { ...c, columnId: nextCol };
      }
      return c;
    });

    const updatedStore = { ...store, cards: updatedCards };
    saveStoredKanban(updatedStore);
    setKanbanStore(updatedStore);
  };

  // Add Feed URL
  const handleAddFeed = () => {
    if (!newFeedUrl.trim()) return;
    const name = newFeedName.trim() || 'Nova Agenda Google';
    const newFeed: GoogleCalendarFeed = {
      id: `feed_${Date.now()}`,
      name,
      url: newFeedUrl.trim(),
      color: '#3B82F6',
      enabled: true
    };

    const updatedFeeds = [...feeds, newFeed];
    setFeeds(updatedFeeds);
    saveStoredFeeds(updatedFeeds);
    setNewFeedName('');
    setNewFeedUrl('');
    refreshAllFeeds(updatedFeeds);
  };

  // Import Pasted iCal (.ics)
  const handleImportPastedICS = () => {
    if (!pastedICS.trim()) return;
    const parsed = parseICSContent(pastedICS, 'Google Agenda (Importada)', '#6366F1');
    if (parsed.length > 0) {
      const existingUploaded = getStoredPastedEvents();
      const mergedUploaded = [...parsed, ...existingUploaded];
      saveStoredPastedEvents(mergedUploaded);
      
      const currentUrlCache = getStoredUrlFeedCache();
      setGoogleEvents([...mergedUploaded, ...currentUrlCache]);
      setPastedICS('');
      setFeedStatusMsg(`${parsed.length} eventos do iCal importados e salvos com sucesso!`);
    } else {
      setFeedStatusMsg('Não foi possível identificar eventos no formato iCal informado.');
    }
  };

  // Upload .ics file from Google Calendar Export
  const handleFileUploadICS = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      const text = await file.text();
      const parsed = parseICSContent(text, 'Google Agenda (Exportada)', '#3B82F6');
      if (parsed.length > 0) {
        const existingUploaded = getStoredPastedEvents();
        const mergedUploaded = [...parsed, ...existingUploaded];
        saveStoredPastedEvents(mergedUploaded);
        
        const currentUrlCache = getStoredUrlFeedCache();
        setGoogleEvents([...mergedUploaded, ...currentUrlCache]);
        setFeedStatusMsg(`${parsed.length} eventos do arquivo "${file.name}" importados com sucesso!`);
      } else {
        setFeedStatusMsg('Nenhum evento válido encontrado no arquivo .ics.');
      }
    } catch (err: any) {
      setFeedStatusMsg('Erro ao ler o arquivo .ics.');
    }
  };

  // Clear all imported Google events
  const handleClearAllEvents = () => {
    saveStoredPastedEvents([]);
    saveStoredUrlFeedCache([]);
    setGoogleEvents([]);
    setFeedStatusMsg('Todos os eventos do Google e arquivos em cache foram excluídos.');
  };

  // Clear only uploaded .ics events
  const handleClearUploadedEvents = () => {
    saveStoredPastedEvents([]);
    const currentUrlCache = getStoredUrlFeedCache();
    setGoogleEvents(currentUrlCache);
    setFeedStatusMsg('Eventos de arquivos .ics importados foram excluídos.');
  };

  // Delete specific feed
  const handleDeleteFeed = (id: string) => {
    const updated = feeds.filter(f => f.id !== id);
    setFeeds(updated);
    saveStoredFeeds(updated);
    refreshAllFeeds(updated);
  };

  // Metrics for Today
  const todayEvents = combinedEvents.filter(e => e.start.startsWith(todayStr));
  const todayGoogleCount = todayEvents.filter(e => e.source === 'google').length;
  const todayKanbanCount = todayEvents.filter(e => e.source === 'kanban').length;
  const todayKanbanCompleted = todayEvents.filter(e => e.source === 'kanban' && e.completed).length;
  const overdueKanbanCount = kanbanEvents.filter(e => e.start < todayStr && !e.completed).length;

  // Open Kanban Card Modal
  const handleOpenKanbanCard = (cardId?: string) => {
    if (!cardId) return;
    const found = kanbanStore.cards.find(c => c.id === cardId);
    if (found) {
      setEditingKanbanCard(found);
    }
  };

  const handleSaveKanbanCardModal = (savedCard: KanbanCard) => {
    const exists = kanbanStore.cards.some(c => c.id === savedCard.id);
    const updatedCards = exists
      ? kanbanStore.cards.map(c => c.id === savedCard.id ? savedCard : c)
      : [...kanbanStore.cards, savedCard];

    const newStore = { ...kanbanStore, cards: updatedCards };
    setKanbanStore(newStore);
    saveStoredKanban(newStore);
    setEditingKanbanCard(null);
  };

  const handleDeleteKanbanCardModal = (cardId: string) => {
    const updatedCards = kanbanStore.cards.filter(c => c.id !== cardId);
    const newStore = { ...kanbanStore, cards: updatedCards };
    setKanbanStore(newStore);
    saveStoredKanban(newStore);
    setEditingKanbanCard(null);
  };

  // Selected Day Events for Timeline View
  const selectedDayEvents = combinedEvents.filter(e => e.start.startsWith(selectedDateStr));

  // All upcoming events for selected day
  // Priority: Google Calendar events first, then Kanban demands
  // Excludes past events (if selected date === today)
  // Sorted chronologically by start time within each group
  const upcomingDayEvents = useMemo(() => {
    const isSelectedToday = selectedDateStr === todayStr;
    const now = new Date();
    const nowHours = String(now.getHours()).padStart(2, '0');
    const nowMins = String(now.getMinutes()).padStart(2, '0');
    const nowTimeStr = `${todayStr}T${nowHours}:${nowMins}:00`;

    return combinedEvents
      .filter(e => e.start.startsWith(selectedDateStr))
      .filter(e => {
        if (isSelectedToday) {
          const compareTime = e.end || e.start;
          if (!compareTime.includes('T')) return true; // keep all-day events
          return compareTime >= nowTimeStr;
        }
        return true;
      })
      .sort((a, b) => {
        // Priority 1: Google events first, Kanban second
        if (a.source !== b.source) {
          return a.source === 'google' ? -1 : 1;
        }
        // Priority 2: Chronological time ascending
        const timeA = a.start.includes('T') ? a.start.split('T')[1] : '00:00:00';
        const timeB = b.start.includes('T') ? b.start.split('T')[1] : '00:00:00';
        return timeA.localeCompare(timeB);
      });
  }, [combinedEvents, selectedDateStr, todayStr]);

  // Time Slots for Day View (07:00 to 20:00)
  const timeSlots = Array.from({ length: 14 }, (_, i) => i + 7);

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header Banner & Metrics Container */}
      <div className="bg-[#101010] p-4 sm:p-6 rounded-2xl border border-[#222222] shadow-xl space-y-4">
        {/* Compact Mobile Header (md:hidden) */}
        <div 
          onClick={() => setIsMobileHeaderExpanded(!isMobileHeaderExpanded)}
          className="md:hidden flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-400 flex-shrink-0" />
            <span className="font-extrabold text-sm text-white">Agenda</span>
            <span className="text-[10px] font-bold text-slate-400 bg-[#161616] px-2 py-0.5 rounded-md border border-[#222222]">
              {todayGoogleCount + todayKanbanCount} eventos hoje
            </span>
          </div>

          <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => refreshAllFeeds()}
              disabled={isRefreshing}
              className="p-1.5 rounded-xl bg-[#161616] border border-[#222222] text-indigo-400 hover:text-indigo-300"
              title="Sincronizar Google Agenda"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setIsMobileHeaderExpanded(!isMobileHeaderExpanded)}
              className={`px-2.5 py-1 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 ${
                isMobileHeaderExpanded 
                  ? 'bg-brand-yellow text-dark-900 border-brand-yellow font-extrabold' 
                  : 'bg-[#161616] text-slate-300 border-[#222222]'
              }`}
            >
              <span>{isMobileHeaderExpanded ? 'Fechar' : 'Opções'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMobileHeaderExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Full Header Controls & Metrics (Always visible on Desktop, Collapsible on Mobile with Smooth Transition) */}
        <div className={`overflow-hidden transition-all duration-500 ease-in-out space-y-4 ${
          isMobileHeaderExpanded 
            ? 'max-h-[1000px] opacity-100 pt-2 block' 
            : 'max-h-0 opacity-0 pt-0 pointer-events-none hidden md:max-h-[1000px] md:opacity-100 md:pt-0 md:pointer-events-auto md:block'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#222222]">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex-shrink-0">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Agenda
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  Acompanhamento dos compromissos da sua Google Agenda e entregas do Kanban.
                </p>
              </div>
            </div>

            {/* Action Controls */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => refreshAllFeeds()}
                disabled={isRefreshing}
                className="px-3.5 py-2 rounded-xl bg-[#161616] hover:bg-[#1F1F1F] text-slate-300 border border-[#222222] transition-colors flex items-center gap-2 text-xs font-semibold disabled:opacity-50"
                title="Sincronizar Google Agenda"
              >
                <RefreshCw className={`w-4 h-4 text-indigo-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Sincronizar Google</span>
              </button>

              <button
                onClick={() => setShowConfigModal(true)}
                className="px-3.5 py-2 rounded-xl bg-[#161616] hover:bg-[#1F1F1F] text-slate-300 border border-[#222222] transition-colors flex items-center gap-2 text-xs font-semibold"
                title="Configurar Feeds do Google Agenda"
              >
                <Settings className="w-4 h-4 text-amber-400" />
                <span>Minhas Agendas</span>
              </button>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
            <div className="bg-[#141414] p-3 sm:p-4 rounded-xl border border-[#222222] space-y-1 shadow-md">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                <span>Google (Hoje)</span>
                <div className="w-2 h-2 rounded-full bg-blue-500" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-white">{todayGoogleCount}</p>
              <span className="text-[10px] text-blue-400 font-medium">Google Agenda</span>
            </div>

            <div className="bg-[#141414] p-3 sm:p-4 rounded-xl border border-[#222222] space-y-1 shadow-md">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                <span>Kanban (Hoje)</span>
                <div className="w-2 h-2 rounded-full bg-amber-500" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-white">{todayKanbanCount}</p>
              <span className="text-[10px] text-amber-400 font-medium">Entregas agendadas</span>
            </div>

            <div className={`p-3 sm:p-4 rounded-xl border space-y-1 shadow-md ${
              overdueKanbanCount > 0 
                ? 'bg-[#141414] border-red-500/40' 
                : 'bg-[#141414] border-[#222222]'
            }`}>
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                <span>Atrasadas</span>
                <AlertCircle className={`w-3.5 h-3.5 ${overdueKanbanCount > 0 ? 'text-red-400 animate-pulse' : 'text-slate-600'}`} />
              </div>
              <p className={`text-xl sm:text-2xl font-black ${overdueKanbanCount > 0 ? 'text-red-400' : 'text-slate-300'}`}>
                {overdueKanbanCount}
              </p>
              <span className={`text-[10px] font-medium ${overdueKanbanCount > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                {overdueKanbanCount > 0 ? 'Atenção necessária' : 'Nenhuma atrasada'}
              </span>
            </div>

            <div className="bg-[#141414] p-3 sm:p-4 rounded-xl border border-[#222222] space-y-1 shadow-md">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                <span>Progresso</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-emerald-400">
                {todayKanbanCount > 0 ? `${Math.round((todayKanbanCompleted / todayKanbanCount) * 100)}%` : '100%'}
              </p>
              <span className="text-[10px] text-slate-400 font-medium">
                {todayKanbanCompleted} de {todayKanbanCount} concluídas
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Date Bar & View Switcher */}
      <div className="bg-[#101010] p-4 rounded-2xl border border-[#222222] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Date Navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#161616] p-1 rounded-xl border border-[#222222]">
            <button 
              onClick={handlePrev}
              className="p-1.5 rounded-lg hover:bg-dark-600 text-slate-300 transition-colors"
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={handleToday}
              className="px-3 py-1 text-xs font-bold text-white hover:bg-dark-600 rounded-lg transition-colors"
            >
              Hoje
            </button>
            <button 
              onClick={handleNext}
              className="p-1.5 rounded-lg hover:bg-dark-600 text-slate-300 transition-colors"
              title="Próximo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-lg font-bold text-white tracking-tight">
            {currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </h2>
        </div>

        {/* View Switcher & Category Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 border-r border-slate-700/60 pr-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer hover:text-white transition-colors">
              <input 
                type="checkbox" 
                checked={showGoogleEvents} 
                onChange={e => setShowGoogleEvents(e.target.checked)}
                className="rounded bg-dark-900 border-slate-700 text-blue-500 focus:ring-blue-500/20" 
              />
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Google Agenda
            </label>

            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer hover:text-white transition-colors ml-2">
              <input 
                type="checkbox" 
                checked={showKanbanEvents} 
                onChange={e => setShowKanbanEvents(e.target.checked)}
                className="rounded bg-dark-900 border-slate-700 text-amber-500 focus:ring-amber-500/20" 
              />
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Demandas Kanban
            </label>
          </div>

          {/* View Mode Buttons */}
          <div className="flex items-center bg-dark-700/60 p-1 rounded-xl border border-slate-700/50">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'day' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dia
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'week' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'month' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Mês
            </button>
          </div>
        </div>
      </div>

      {/* Main Agenda Content Views */}
      {viewMode === 'day' && (
        <div className="bg-dark-800 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
          {/* Collapsible Top Preview Banner (Próximas Atividades) */}
          <div className="p-3.5 sm:p-5 bg-[#101010] border-b border-[#222222] space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <span>
                  {isPreviewExpanded 
                    ? `Todos os Compromissos (${upcomingDayEvents.length})` 
                    : `Próximas Atividades (${upcomingDayEvents.length})`}
                </span>
                <span className="text-[10px] text-slate-500 font-normal">({selectedDateStr})</span>
              </h3>

              <button
                onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#161616] border border-[#222222] transition-all"
              >
                <span>
                  {isPreviewExpanded 
                    ? 'Recolher' 
                    : `Ver Todos ${upcomingDayEvents.length > 2 ? `(+${upcomingDayEvents.length - 2})` : ''}`}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isPreviewExpanded ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Activities List */}
            {upcomingDayEvents.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2 text-center">
                Nenhuma atividade pendente para hoje.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 transition-all duration-500 ease-in-out">
                {upcomingDayEvents.map((event, idx) => {
                  const isExtra = idx >= 2;
                  const isVisible = isPreviewExpanded || !isExtra;

                  return (
                    <div
                      key={event.id}
                      onClick={() => event.source === 'kanban' && handleOpenKanbanCard(event.kanbanCardId)}
                      className={`transition-all duration-500 ease-in-out overflow-hidden ${
                        isVisible
                          ? 'max-h-[500px] opacity-100 p-3.5 border rounded-xl flex flex-col justify-between gap-2.5 shadow-md'
                          : 'max-h-0 opacity-0 p-0 m-0 border-0 pointer-events-none'
                      } ${
                        event.source === 'google'
                          ? 'border-blue-500/30 bg-[#121824] text-blue-100'
                          : event.completed
                          ? 'border-emerald-500/30 bg-[#122019] text-emerald-300 opacity-80'
                          : 'border-amber-500/30 bg-[#221c10] text-amber-100 cursor-pointer hover:border-amber-400'
                      }`}
                    >
                    {/* Card Header: Source Badge + Time Badge */}
                    <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="w-2 h-2 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: event.color || (event.source === 'google' ? '#3B82F6' : '#FACC15') }}
                        />
                        <span className="text-[11px] font-extrabold uppercase tracking-wider opacity-90">
                          {event.calendarName || (event.source === 'google' ? 'Google Agenda' : 'Kanban')}
                        </span>
                      </div>

                      {/* Time Badge */}
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-black/40 border border-white/10 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {event.start.includes('T') ? event.start.split('T')[1].substring(0, 5) : 'Dia Inteiro'}
                        {event.end && event.end.includes('T') ? ` - ${event.end.split('T')[1].substring(0, 5)}` : ''}
                      </span>
                    </div>

                    {/* Card Title */}
                    <div>
                      <h4 className={`text-xs sm:text-sm font-bold leading-snug ${event.completed ? 'line-through opacity-75' : 'text-white'}`}>
                        {event.title}
                      </h4>
                      {event.description && (
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1 font-normal leading-relaxed">{event.description}</p>
                      )}
                    </div>

                    {/* Card Actions Footer */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      {event.meetUrl ? (
                        <a
                          href={event.meetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm"
                          onClick={e => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Entrar no Google Meet</span>
                        </a>
                      ) : <div />}

                      {event.source === 'kanban' && (
                        <div className="flex items-center gap-2 ml-auto">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleKanbanCompletion(event.kanbanCardId);
                            }}
                            className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 ${
                              event.completed 
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                                : 'bg-[#161616] border-[#222222] text-slate-300 hover:text-white'
                            }`}
                          >
                            {event.completed ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                            <span>{event.completed ? 'Concluída' : 'Concluir'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </div>

          {/* Day Timeline Grid (07:00 to 20:00) */}
          <div className="p-4 divide-y divide-slate-800/60 max-h-[600px] overflow-y-auto custom-scrollbar">
            {timeSlots.map(hour => {
              const hourStr = String(hour).padStart(2, '0');
              const eventsInHour = selectedDayEvents.filter(e => {
                if (e.allDay) return false;
                if (!e.start.includes('T')) return false;
                const eHour = e.start.split('T')[1].substring(0, 2);
                return eHour === hourStr;
              });

              return (
                <div key={hour} className="py-3 flex items-start gap-4 hover:bg-dark-700/20 transition-colors rounded-lg px-2">
                  <div className="w-14 text-xs font-mono font-bold text-slate-500 flex-shrink-0">
                    {hourStr}:00
                  </div>

                  <div className="flex-1 space-y-2">
                    {eventsInHour.length === 0 ? (
                      <div className="h-6 border-b border-dashed border-slate-800/60" />
                    ) : (
                      eventsInHour.map(event => (
                        <div 
                          key={event.id}
                          onClick={() => event.source === 'kanban' && handleOpenKanbanCard(event.kanbanCardId)}
                          className={`p-3 rounded-xl bg-dark-700/60 border border-slate-700/80 flex items-center justify-between gap-3 shadow-sm transition-all ${
                            event.source === 'kanban' ? 'cursor-pointer hover:border-amber-400/80 hover:bg-dark-700' : ''
                          }`}
                          title={event.source === 'kanban' ? 'Clique para ver/editar no Kanban' : undefined}
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-1.5 h-8 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: event.color || '#3B82F6' }} 
                            />
                            <div>
                              <p className="text-xs font-bold text-white flex items-center gap-2">
                                <span>{event.title}</span>
                                {event.source === 'kanban' && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold uppercase">
                                    Kanban
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-slate-400 flex items-center gap-2">
                                <span>{event.calendarName || 'Google Agenda'}</span>
                                {event.location && <span>• {event.location}</span>}
                              </p>
                            </div>
                          </div>

                          <span className="text-[11px] font-mono text-slate-300 font-semibold px-2 py-0.5 rounded bg-dark-900 border border-slate-700">
                            {event.start.split('T')[1].substring(0, 5)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Visão Semanal */}
      {viewMode === 'week' && (
        <div className="bg-dark-800 p-4 rounded-2xl border border-slate-800 shadow-xl overflow-x-auto">
          <div className="grid grid-cols-7 gap-3 min-w-[800px]">
            {Array.from({ length: 7 }, (_, i) => {
              const day = new Date(currentDate);
              const dayOfWeek = day.getDay() === 0 ? 6 : day.getDay() - 1;
              day.setDate(day.getDate() - dayOfWeek + i);
              const dayStr = formatDateYYYYMMDD(day);
              const dayEvents = combinedEvents.filter(e => e.start.startsWith(dayStr));
              const isToday = dayStr === todayStr;

              return (
                <div 
                  key={i} 
                  className={`p-3 rounded-xl border flex flex-col justify-between min-h-[300px] ${
                    isToday 
                      ? 'bg-indigo-950/20 border-indigo-500/40' 
                      : 'bg-dark-700/40 border-slate-800'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="border-b border-slate-800 pb-2 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {day.toLocaleDateString('pt-BR', { weekday: 'short' })}
                      </span>
                      <span className={`text-base font-black ${isToday ? 'text-indigo-400' : 'text-white'}`}>
                        {day.getDate()}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {dayEvents.map(event => (
                        <div
                          key={event.id}
                          className={`p-2 rounded-lg text-[11px] font-medium border truncate ${
                            event.source === 'google' 
                              ? 'bg-blue-950/40 border-blue-500/40 text-blue-200' 
                              : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                          }`}
                          title={`${event.title} (${event.calendarName})`}
                        >
                          <p className="font-bold truncate">{event.title}</p>
                          <p className="text-[9px] opacity-75">{event.calendarName}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Visão Mensal */}
      {viewMode === 'month' && (
        <div className="bg-dark-800 p-5 rounded-2xl border border-slate-800 shadow-xl space-y-4">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-800">
            <span>Seg</span>
            <span>Ter</span>
            <span>Qua</span>
            <span>Qui</span>
            <span>Sex</span>
            <span>Sáb</span>
            <span>Dom</span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }, (_, i) => {
              const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
              const startOffset = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1;
              
              const day = new Date(firstDayOfMonth);
              day.setDate(day.getDate() - startOffset + i);
              const dayStr = formatDateYYYYMMDD(day);
              const dayEvents = combinedEvents.filter(e => e.start.startsWith(dayStr));
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isToday = dayStr === todayStr;

              return (
                <div
                  key={i}
                  className={`p-2 rounded-xl border min-h-[90px] flex flex-col justify-between transition-colors ${
                    isToday
                      ? 'bg-indigo-950/30 border-indigo-500/50'
                      : isCurrentMonth
                      ? 'bg-dark-700/30 border-slate-800/80 hover:bg-dark-700/60'
                      : 'bg-dark-900/40 border-slate-800/30 opacity-40'
                  }`}
                >
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className={isToday ? 'text-indigo-400' : 'text-slate-300'}>{day.getDate()}</span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-300 font-mono">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map(ev => (
                      <div
                        key={ev.id}
                        className={`text-[9px] font-semibold truncate px-1.5 py-0.5 rounded ${
                          ev.source === 'google' ? 'bg-blue-500/20 text-blue-300' : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <p className="text-[9px] text-slate-500 text-center font-semibold">+ {dayEvents.length - 2} mais</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Config Modal ("Minhas Agendas do Google") */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-dark-800 border border-slate-800 w-full max-w-xl rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Configurar Google Agenda</h3>
                  <p className="text-xs text-slate-400">Gerencie links iCal e arquivos `.ics` importados.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowConfigModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {feedStatusMsg && (
              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/40 text-indigo-300 text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>{feedStatusMsg}</span>
              </div>
            )}

            {/* List Active Feeds */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Feeds & Agendas Cadastradas ({feeds.length})
                </h4>
                {googleEvents.length > 0 && (
                  <button
                    onClick={handleClearAllEvents}
                    className="text-[11px] text-red-400 hover:text-red-300 font-semibold hover:underline flex items-center gap-1"
                    title="Excluir todos os eventos do Google em cache"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Limpar Eventos ({googleEvents.length})</span>
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {feeds.map(feed => (
                  <div key={feed.id} className="p-3 rounded-xl bg-dark-700/60 border border-slate-700 flex items-center justify-between gap-3 text-xs">
                    <div className="truncate space-y-0.5">
                      <p className="font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: feed.color }} />
                        {feed.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate max-w-sm font-mono">{feed.url}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold uppercase">
                        Ativo
                      </span>
                      <button
                        onClick={() => handleDeleteFeed(feed.id)}
                        className="p-1 text-slate-500 hover:text-red-400 rounded hover:bg-dark-600 transition-colors"
                        title="Remover agenda"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Feed Form */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Adicionar Novo Link iCal (.ics)
                </h4>
              </div>

              <p className="text-[11px] text-amber-400/90 font-medium">
                💡 <strong>Dica para contas de empresa (Google Workspace):</strong> Como a empresa bloqueia detalhes em links públicos, utilize o <u>"Endereço secreto em formato iCal"</u> (com chave <code>/private-.../basic.ics</code>) que fica logo abaixo em Configurações -&gt; Integrar agenda.
              </p>

              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Nome da Agenda (ex: Google Agenda Trabalho)"
                  value={newFeedName}
                  onChange={e => setNewFeedName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-dark-900 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-amber-500 outline-none"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Cole a URL iCal privada (https://calendar.google.com/calendar/ical/.../private-.../basic.ics)"
                    value={newFeedUrl}
                    onChange={e => setNewFeedUrl(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-dark-900 border border-slate-700 text-white text-xs focus:ring-1 focus:ring-amber-500 outline-none font-mono"
                  />
                  <button
                    onClick={handleAddFeed}
                    disabled={!newFeedUrl.trim()}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-dark-950 font-bold text-xs rounded-xl transition-all"
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            </div>

            {/* Import Pasted or Uploaded ICS */}
            <div className="space-y-3 pt-3 border-t border-slate-800">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Importar Arquivo .ics Exportado do Google Agenda
              </h4>

              <div className="flex items-center gap-3">
                <label className="flex-1 border border-dashed border-slate-700 hover:border-slate-500 rounded-xl p-2.5 text-center cursor-pointer bg-dark-900/60 hover:bg-dark-900 transition-colors">
                  <input
                    type="file"
                    accept=".ics,.txt"
                    onChange={handleFileUploadICS}
                    className="hidden"
                  />
                  <span className="text-xs text-indigo-400 font-semibold flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4 text-indigo-400" />
                    <span>Upload de arquivo .ics do computador</span>
                  </span>
                </label>
              </div>

              <textarea
                rows={2}
                placeholder="Ou cole aqui o conteúdo texto .ics que começa com BEGIN:VCALENDAR..."
                value={pastedICS}
                onChange={e => setPastedICS(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-dark-900 border border-slate-700 text-white text-xs font-mono focus:ring-1 focus:ring-indigo-500 outline-none custom-scrollbar"
              />
              <button
                onClick={handleImportPastedICS}
                disabled={!pastedICS.trim()}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Importar Texto Colado</span>
              </button>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 rounded-xl bg-dark-700 hover:bg-dark-600 text-white text-xs font-semibold"
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Card Modal */}
      {editingKanbanCard && (
        <KanbanCardModal
          card={editingKanbanCard}
          columns={kanbanStore.columns}
          tags={kanbanStore.tags}
          onSave={handleSaveKanbanCardModal}
          onDelete={handleDeleteKanbanCardModal}
          onClose={() => setEditingKanbanCard(null)}
        />
      )}
    </div>
  );
};
