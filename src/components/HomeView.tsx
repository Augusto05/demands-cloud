import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  PhoneCall, 
  Sparkles, 
  FileText, 
  CheckSquare, 
  Square, 
  ArrowRight, 
  StickyNote,
  Building2,
  RefreshCw,
  Send,
  Save,
  TrendingUp,
  Plus,
  Minus
} from 'lucide-react';
import { Office, DailyHourlyStore, KanbanCard, KanbanStore, GeneratedFile } from '../types';
import { getAllStoredGoogleEvents, CalendarEvent } from '../services/googleCalendarService';
import { getStoredKanban, saveStoredKanban } from '../services/kanbanService';
import { getStoredNotesStore, saveStoredNotesStore } from '../services/notesService';
import { getStoredGeneratedFiles } from '../services/generatedFilesService';
import { KanbanCardModal } from './KanbanCardModal';

interface HomeViewProps {
  offices: Office[];
  dailyHourly: DailyHourlyStore;
  onSaveDailyHourly: (newDailyHourly: DailyHourlyStore) => void;
  onNavigateTab: (tab: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ 
  offices, 
  dailyHourly, 
  onSaveDailyHourly,
  onNavigateTab 
}) => {
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
  const [historyFiles, setHistoryFiles] = useState<GeneratedFile[]>([]);
  const [kanbanStore, setKanbanStore] = useState<KanbanStore>(getStoredKanban());
  const [quickNoteText, setQuickNoteText] = useState('');
  const [noteSavedMsg, setNoteSavedMsg] = useState<string | null>(null);
  const [editingKanbanCard, setEditingKanbanCard] = useState<KanbanCard | null>(null);

  // Date formatting
  const todayDate = new Date();
  const year = todayDate.getFullYear();
  const monthStr = String(todayDate.getMonth() + 1).padStart(2, '0');
  const dayStr = String(todayDate.getDate()).padStart(2, '0');
  const todayYYYYMMDD = `${year}-${monthStr}-${dayStr}`;
  const dateSheetKey = `${dayStr}.${monthStr}`;

  // Time-aware greeting
  const hourNow = todayDate.getHours();
  let greeting = 'Bom dia';
  if (hourNow >= 12 && hourNow < 18) greeting = 'Boa tarde';
  if (hourNow >= 18 || hourNow < 5) greeting = 'Boa noite';

  const rawDateFormatted = todayDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const dateFormattedDisplay = rawDateFormatted.charAt(0).toUpperCase() + rawDateFormatted.slice(1);

  // Automatic Target Hour (clamped to 9-17, defaulting to 17 outside business hours)
  const targetHour = (hourNow >= 9 && hourNow <= 17) ? hourNow : 17;

  // Selected office state for quick entry
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>(offices[0]?.id || '');
  const selectedOfficeObj = offices.find(o => o.id === selectedOfficeId) || offices[0];

  // Get current hourly store for selected office & date
  const storeForDate = dailyHourly[dateSheetKey] || dailyHourly[todayYYYYMMDD] || {};
  const currentOfficeRecord = (selectedOfficeObj && storeForDate[selectedOfficeObj.name]) || {
    hourly: { 9: 0, 10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 0, 16: 0, 17: 0 },
    contas: 0
  };

  const [boletosInput, setBoletosInput] = useState<number>(currentOfficeRecord.hourly[targetHour] || 0);
  const [hourlySavedMsg, setHourlySavedMsg] = useState<string | null>(null);

  // Sync inputs when office or target hour changes
  useEffect(() => {
    if (!selectedOfficeObj) return;
    const rec = storeForDate[selectedOfficeObj.name] || {
      hourly: { 9: 0, 10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 0, 16: 0, 17: 0 },
      contas: 0
    };
    setBoletosInput(rec.hourly[targetHour] || 0);
  }, [selectedOfficeId, targetHour, dailyHourly, offices]);

  // Load Google events and history files on mount
  useEffect(() => {
    setGoogleEvents(getAllStoredGoogleEvents());
    setHistoryFiles(getStoredGeneratedFiles());
  }, []);

  // Save Hourly Entry
  const handleSaveHourlyEntry = () => {
    const newStore = { ...dailyHourly };

    const saveRecordForDateKey = (dateKey: string) => {
      const dayData = newStore[dateKey] ? { ...newStore[dateKey] } : {};
      const existing = dayData[selectedOfficeObj.name]
        ? { ...dayData[selectedOfficeObj.name] }
        : { hourly: { 9: 0, 10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 0, 16: 0, 17: 0 }, contas: 0 };

      const updatedHourly = {
        ...existing.hourly,
        [targetHour]: Number(boletosInput) || 0
      };

      dayData[selectedOfficeObj.name] = {
        ...existing,
        hourly: updatedHourly
      };

      newStore[dateKey] = dayData;
    };

    saveRecordForDateKey(dateSheetKey);
    saveRecordForDateKey(todayYYYYMMDD);

    onSaveDailyHourly(newStore);

    setHourlySavedMsg(`Boletos das ${targetHour}h de ${selectedOfficeObj.name} salvos!`);
    setTimeout(() => setHourlySavedMsg(null), 3500);
  };

  // 1. Google Meetings Count & Next Meeting Reminder
  const todayGoogleEvents = googleEvents
    .filter(e => e.source === 'google' && e.start.startsWith(todayYYYYMMDD))
    .sort((a, b) => a.start.localeCompare(b.start));

  const nowHours = String(todayDate.getHours()).padStart(2, '0');
  const nowMins = String(todayDate.getMinutes()).padStart(2, '0');
  const nowTimeStr = `${todayYYYYMMDD}T${nowHours}:${nowMins}:00`;

  const upcomingMeetings = todayGoogleEvents.filter(e => {
    const compareTime = e.end || e.start;
    return compareTime >= nowTimeStr;
  });

  const nextMeeting = upcomingMeetings.length > 0 ? upcomingMeetings[0] : null;

  let reminderLabel = '';
  if (nextMeeting) {
    const startTimeMs = new Date(nextMeeting.start).getTime();
    const diffMins = Math.round((startTimeMs - todayDate.getTime()) / 60000);
    if (diffMins <= 0) {
      reminderLabel = 'Acontecendo agora!';
    } else if (diffMins < 60) {
      reminderLabel = `Em ${diffMins} min`;
    } else {
      const h = Math.floor(diffMins / 60);
      const m = diffMins % 60;
      reminderLabel = `Em ${h}h${m > 0 ? `${m}m` : ''}`;
    }
  }

  // 2. Total Boletos Today Across All Offices
  let totalBoletosToday = 0;
  const activeDayStore = dailyHourly[dateSheetKey] || dailyHourly[todayYYYYMMDD];
  if (activeDayStore) {
    Object.values(activeDayStore).forEach(offData => {
      if (offData.hourly) {
        Object.values(offData.hourly).forEach(val => {
          totalBoletosToday += Number(val) || 0;
        });
      }
    });
  }

  // 3. Top 2 Kanban Demands for Today
  const todayKanbanCards = kanbanStore.cards
    .filter(c => c.dueDate === todayYYYYMMDD)
    .slice(0, 2);

  // Toggle Kanban completion
  const handleToggleKanban = (cardId: string) => {
    const updatedCards = kanbanStore.cards.map(c => {
      if (c.id === cardId) {
        const isDone = c.columnId === 'col-feito';
        return { ...c, columnId: isDone ? 'col-afazer' : 'col-feito' };
      }
      return c;
    });
    const newStore = { ...kanbanStore, cards: updatedCards };
    setKanbanStore(newStore);
    saveStoredKanban(newStore);
  };

  // 4. Smart Checklist for Abandonadas
  const getAbandonadasStatus = () => {
    try {
      const raw = localStorage.getItem('demands_generated_files');
      if (raw) {
        const files: GeneratedFile[] = JSON.parse(raw);
        const abandonadasToday = files.filter(
          f => f.module === 'abandonadas' && f.createdAt.startsWith(todayYYYYMMDD)
        );

        const alianca = abandonadasToday.find(
          f => f.fileName.toLowerCase().includes('alianca') || f.fileName.toLowerCase().includes('aliança')
        );
        const escritorio = abandonadasToday.find(
          f => !f.fileName.toLowerCase().includes('alianca') && !f.fileName.toLowerCase().includes('aliança')
        );

        return {
          aliancaDone: !!alianca,
          aliancaTime: alianca
            ? new Date(alianca.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : null,
          escritorioDone: !!escritorio,
          escritorioTime: escritorio
            ? new Date(escritorio.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            : null
        };
      }
    } catch (e) {
      console.error(e);
    }
    return { aliancaDone: false, aliancaTime: null, escritorioDone: false, escritorioTime: null };
  };

  const abandonadasChecklist = getAbandonadasStatus();

  // 5. Quick Note Handler
  const handleSaveQuickNote = () => {
    if (!quickNoteText.trim()) return;
    const store = getStoredNotesStore();
    const newNote = {
      id: `note-${Date.now()}`,
      folderId: 'folder-geral',
      title: quickNoteText.trim().substring(0, 45) + (quickNoteText.length > 45 ? '...' : ''),
      content: quickNoteText.trim(),
      officeTags: [],
      images: [],
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    store.notes.unshift(newNote);
    saveStoredNotesStore(store);
    setQuickNoteText('');
    setNoteSavedMsg('Nota salva no Bloco de Notas!');
    setTimeout(() => setNoteSavedMsg(null), 3500);
  };

  if (offices.length === 0) {
    return (
      <div className="p-8 rounded-3xl bg-[#101010] border border-[#222222] text-center space-y-6 max-w-xl mx-auto my-12 shadow-2xl animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-lg shadow-amber-950/30">
          <Building2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white tracking-wide">Bem-vindo ao Demands!</h2>
          <p className="text-xs text-slate-400 font-medium max-w-md mx-auto leading-relaxed">
            Sua plataforma está pronta e 100% limpa. Cadastre seus escritórios corporativos para ativar os relatórios, dashboards e lançamentos diários.
          </p>
        </div>
        <button
          onClick={() => onNavigateTab('offices-settings')}
          className="px-6 py-3.5 rounded-xl bg-[#FACC15] hover:bg-amber-400 text-slate-950 font-extrabold text-xs transition-all inline-flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 cursor-pointer active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Primeiro Escritório</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-[#101010] p-5 sm:p-7 rounded-2xl border border-[#222222] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            {greeting}, Augusto!
          </h1>
          <p className="text-sm sm:text-base text-slate-300 font-semibold mt-1">
            {dateFormattedDisplay}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => onNavigateTab('agenda')}
            className="w-full sm:w-auto px-4 py-3 sm:py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all transform hover:scale-105 active:scale-95"
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Abrir Agenda →</span>
          </button>
        </div>
      </div>

      {/* Top Metrics Row (2 columns on mobile) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Meetings Count */}
        <div className="bg-[#101010] p-3.5 sm:p-5 rounded-2xl border border-[#222222] glass-card-hover cursor-pointer shadow-lg space-y-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider">
            <span>Reuniões Hoje</span>
            <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 flex-shrink-0" />
          </div>
          <p className="text-3xl sm:text-3xl font-black text-white tracking-tight">{todayGoogleEvents.length}</p>
          <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium block truncate">
            {upcomingMeetings.length > 0 ? `${upcomingMeetings.length} pendentes` : 'Todas concluídas'}
          </span>
        </div>

        {/* Metric 2: Next Meeting Live Reminder */}
        <div 
          onClick={() => onNavigateTab('agenda')}
          className="bg-[#101010] p-3.5 sm:p-5 rounded-2xl border border-[#222222] glass-card-hover cursor-pointer shadow-lg relative overflow-hidden flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider gap-1.5 mb-1">
            <span className="flex items-center gap-1.5 min-w-0 truncate">
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse flex-shrink-0" />
              <span className="truncate">Próx. Reunião</span>
            </span>
            {reminderLabel && (
              <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-[#1C1C1C] text-slate-300 border border-[#2B2B2B] font-mono font-bold flex-shrink-0">
                {reminderLabel}
              </span>
            )}
          </div>

          {nextMeeting ? (
            <div className="space-y-1.5">
              <h3 className="text-xs sm:text-sm font-extrabold text-white truncate leading-snug" title={nextMeeting.title}>
                {nextMeeting.title}
              </h3>
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <p className="text-[11px] sm:text-xs font-mono text-blue-200 font-bold flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  <span>{nextMeeting.start.includes('T') ? nextMeeting.start.split('T')[1].substring(0, 5) : 'Hoje'}</span>
                </p>
                {nextMeeting.meetUrl && (
                  <a
                    href={nextMeeting.meetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[10px] sm:text-xs font-black transition-all shadow-md flex-shrink-0 active:scale-95"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Meet</span>
                  </a>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[10px] sm:text-xs text-slate-500 italic pt-1">
              Nenhuma reunião pendente.
            </p>
          )}
        </div>

        {/* Metric 3: Total Boletos Today */}
        <div className="bg-[#101010] p-3.5 sm:p-5 rounded-2xl border border-[#222222] glass-card-hover cursor-pointer shadow-lg space-y-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider">
            <span>Boletos Hoje</span>
            <PhoneCall className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 flex-shrink-0" />
          </div>
          <p className="text-3xl sm:text-3xl font-black text-emerald-400 tracking-tight">{totalBoletosToday}</p>
          <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium block truncate">
            Acumulado no dia
          </span>
        </div>

        {/* Metric 4: Kanban Demands Count */}
        <div className="bg-[#101010] p-3.5 sm:p-5 rounded-2xl border border-[#222222] glass-card-hover cursor-pointer shadow-lg space-y-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider">
            <span>Demandas Kanban</span>
            <CheckSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 flex-shrink-0" />
          </div>
          <p className="text-3xl sm:text-3xl font-black text-white tracking-tight">
            {kanbanStore.cards.filter(c => c.dueDate === todayYYYYMMDD).length}
          </p>
          <span className="text-[10px] sm:text-[11px] text-amber-400 font-medium block truncate">
            Entregas de hoje
          </span>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Spans): Kanban Tasks + Smart Checklist */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top 2 Kanban Demands */}
          <div className="bg-[#101010] rounded-2xl border border-[#222222] p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#1C1C1C] text-amber-400 border border-[#2B2B2B] flex items-center justify-center flex-shrink-0">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-white">
                    Demandas Prioritárias do Kanban (Hoje)
                  </h2>
                  <p className="text-[10px] text-slate-400">Acompanhamento e conclusão rápida de tarefas</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('kanban')}
                className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 hover:underline"
              >
                <span>Ver Kanban →</span>
              </button>
            </div>

            {todayKanbanCards.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-3 text-center">
                Nenhuma demanda pendente para hoje no Kanban.
              </p>
            ) : (
              <div className="space-y-3">
                {todayKanbanCards.map(card => {
                  const isDone = card.columnId === 'col-feito';
                  return (
                    <div
                      key={card.id}
                      className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                        isDone 
                          ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300 opacity-75'
                          : 'bg-dark-700/60 border-slate-700 hover:border-amber-500/50'
                      }`}
                    >
                      <div 
                        className="space-y-1 cursor-pointer min-w-0 flex-1"
                        onClick={() => setEditingKanbanCard(card)}
                      >
                        <h4 className={`text-sm font-bold ${isDone ? 'line-through opacity-80' : 'text-white'} hover:text-amber-300`}>
                          {card.title}
                        </h4>
                        {card.description && (
                          <p className="text-xs text-slate-400 line-clamp-1">{card.description}</p>
                        )}
                      </div>

                      <button
                        onClick={() => handleToggleKanban(card.id)}
                        className={`p-2 rounded-xl border transition-colors flex-shrink-0 ${
                          isDone 
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                            : 'bg-dark-800 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                        title={isDone ? "Desmarcar" : "Concluir no Kanban"}
                      >
                        {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Smart Checklist: Abandonadas Generation */}
          <div className="bg-[#101010] rounded-2xl border border-[#222222] p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#1C1C1C] text-indigo-400 border border-[#2B2B2B] flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-white">
                    Checklist Inteligente de Automações
                  </h2>
                  <p className="text-[10px] text-slate-400">Verificação automática de arquivos de Abandonadas gerados hoje</p>
                </div>
              </div>

              <button
                onClick={() => onNavigateTab('geracao-abandonadas')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 hover:underline"
              >
                <span>Ir para Abandonadas →</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Item 1: Aliança Sul */}
              <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                abandonadasChecklist.aliancaDone
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-dark-700/50 border-slate-700 text-slate-300'
              }`}>
                <div className="flex items-center gap-3">
                  {abandonadasChecklist.aliancaDone ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 animate-pulse" />
                  )}
                  <div>
                    <h4 className="text-xs font-bold text-white">Abandonadas - Aliança Sul</h4>
                    <p className="text-[10px] opacity-80">
                      {abandonadasChecklist.aliancaDone 
                        ? `✓ Gerado hoje às ${abandonadasChecklist.aliancaTime}` 
                        : 'Pendente hoje'}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  abandonadasChecklist.aliancaDone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {abandonadasChecklist.aliancaDone ? 'Concluído' : 'Pendente'}
                </span>
              </div>

              {/* Item 2: Escritórios */}
              <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                abandonadasChecklist.escritorioDone
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                  : 'bg-dark-700/50 border-slate-700 text-slate-300'
              }`}>
                <div className="flex items-center gap-3">
                  {abandonadasChecklist.escritorioDone ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 animate-pulse" />
                  )}
                  <div>
                    <h4 className="text-xs font-bold text-white">Abandonadas - Escritórios</h4>
                    <p className="text-[10px] opacity-80">
                      {abandonadasChecklist.escritorioDone 
                        ? `✓ Gerado hoje às ${abandonadasChecklist.escritorioTime}` 
                        : 'Pendente hoje'}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  abandonadasChecklist.escritorioDone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {abandonadasChecklist.escritorioDone ? 'Concluído' : 'Pendente'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1 Span): Quick Note Widget */}
        <div className="bg-[#101010] rounded-2xl border border-[#222222] p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#1C1C1C] text-sky-400 border border-[#2B2B2B] flex items-center justify-center flex-shrink-0">
                  <StickyNote className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-white">
                    Anotação Rápida
                  </h2>
                  <p className="text-[10px] text-slate-400">Recado rápido salvo no Bloco de Notas</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateTab('notes')}
                className="text-xs text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 hover:underline"
              >
                <span>Bloco de Notas →</span>
              </button>
            </div>

            {noteSavedMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{noteSavedMsg}</span>
              </div>
            )}

            <p className="text-xs text-slate-400">
              Digite um recado rápido para salvar instantaneamente no seu Bloco de Notas:
            </p>

            <textarea
              rows={6}
              placeholder="Ex: Lembrar de cobrar o relatório de chamadas do escritório Aliança Sul até 16h..."
              value={quickNoteText}
              onChange={e => setQuickNoteText(e.target.value)}
              className="w-full p-3 rounded-xl bg-[#0A0A0A] border border-[#222222] text-white text-xs placeholder:text-slate-500 focus:ring-1 focus:ring-sky-500 outline-none resize-none custom-scrollbar"
            />
          </div>

          <button
            onClick={handleSaveQuickNote}
            disabled={!quickNoteText.trim()}
            className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-600/20 transition-all flex items-center justify-center gap-2"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Salvar no Bloco de Notas</span>
          </button>
        </div>
      </div>

      {/* BOTTOM ROW: Quick Hourly Boletos Entry Widget */}
      <div className="bg-[#101010] rounded-2xl border border-[#222222] p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#222222] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#1C1C1C] text-emerald-400 border border-[#2B2B2B] flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-white">
                Lançamento Rápido de Boletos
              </h2>
              <p className="text-[10px] text-slate-400">Insira os boletos do escritório para o horário das {targetHour}h</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hourlySavedMsg && (
              <div className="p-2 px-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{hourlySavedMsg}</span>
              </div>
            )}

            <button
              onClick={() => onNavigateTab('daily-tracker')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 hover:underline"
            >
              <span>Lançamento Diário →</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* Office Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Selecione o Escritório
            </label>
            <select
              value={selectedOfficeId}
              onChange={e => setSelectedOfficeId(e.target.value)}
              className="w-full h-[42px] px-3.5 rounded-xl bg-[#0A0A0A] border border-[#222222] text-white text-xs font-bold focus:ring-1 focus:ring-emerald-500 outline-none cursor-pointer flex items-center"
            >
              {offices.map(off => (
                <option key={off.id} value={off.id}>{off.name}</option>
              ))}
            </select>
          </div>

          {/* Boletos Input for Target Hour */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Boletos das {targetHour}:00h
            </label>
            <div className="w-full h-[42px] px-2 bg-[#0A0A0A] border border-[#222222] rounded-xl flex items-center justify-between gap-1">
              <button
                type="button"
                onClick={() => setBoletosInput(Math.max(0, boletosInput - 1))}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-700 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                min={0}
                value={boletosInput}
                onChange={e => setBoletosInput(Math.max(0, Number(e.target.value)))}
                className="w-full text-center bg-transparent text-emerald-400 font-mono font-black text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => setBoletosInput(boletosInput + 1)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Save Button */}
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={handleSaveHourlyEntry}
              className="w-full h-[42px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Boletos ({targetHour}h)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Card Modal */}
      {editingKanbanCard && (
        <KanbanCardModal
          card={editingKanbanCard}
          columns={kanbanStore.columns}
          tags={kanbanStore.tags}
          onSave={savedCard => {
            const updatedCards = kanbanStore.cards.map(c => c.id === savedCard.id ? savedCard : c);
            const newStore = { ...kanbanStore, cards: updatedCards };
            setKanbanStore(newStore);
            saveStoredKanban(newStore);
            setEditingKanbanCard(null);
          }}
          onDelete={cardId => {
            const updatedCards = kanbanStore.cards.filter(c => c.id !== cardId);
            const newStore = { ...kanbanStore, cards: updatedCards };
            setKanbanStore(newStore);
            saveStoredKanban(newStore);
            setEditingKanbanCard(null);
          }}
          onClose={() => setEditingKanbanCard(null)}
        />
      )}
    </div>
  );
};
