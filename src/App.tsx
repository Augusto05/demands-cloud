import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { HeaderFilterBar } from './components/HeaderFilterBar';
import { DashboardView } from './components/DashboardView';
import { DailyTrackerView } from './components/DailyTrackerView';
import { WeeklySummaryView } from './components/WeeklySummaryView';
import { MonthlySummaryView } from './components/MonthlySummaryView';
import { DatabaseView } from './components/DatabaseView';
import { OfficeManagementView } from './components/OfficeManagementView';
import { ConversorLeadsView } from './components/ConversorLeadsView';
import { CruzadorBlocklistView } from './components/CruzadorBlocklistView';
import { AbandonadasView } from './components/AbandonadasView';
import { KanbanView } from './components/KanbanView';
import { NotesView } from './components/NotesView';
import { ReciclagemView } from './components/ReciclagemView';
import { AgendaView } from './components/AgendaView';
import { HomeView } from './components/HomeView';
import { BugReportView } from './components/BugReportView';
import { FlowCanvasView } from './components/FlowCanvasView';

import { Office, BaseDataRow, DailyHourlyStore, PeriodFilter } from './types';
import { 
  getStoredOffices, 
  saveStoredOffices, 
  getStoredBaseData, 
  saveStoredBaseData, 
  getStoredDailyHourly, 
  saveStoredDailyHourly,
  exportBaseDataToExcel,
  formatDateToYYYYMMDD,
  getEffectiveBaseData 
} from './services/dataService';
import * as XLSX from 'xlsx';

import { performInitialMigration, fetchAllStorage } from './services/syncService';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { AuthModal } from './components/AuthModal';

export const App: React.FC = () => {
  // Supabase Auth State
  const [userSession, setUserSession] = useState<any>(null);
  const [authChecking, setAuthChecking] = useState<boolean>(isSupabaseConfigured);

  // App State
  const [offices, setOffices] = useState<Office[]>(getStoredOffices);
  const [baseData, setBaseData] = useState<BaseDataRow[]>(getStoredBaseData);
  const [dailyHourly, setDailyHourly] = useState<DailyHourlyStore>(getStoredDailyHourly);

  const [activeTab, setActiveTab] = useState<string>('home');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Listen for Supabase Authentication
  useEffect(() => {
    if (!supabase) {
      setAuthChecking(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserSession(session);
      setAuthChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserSession(session);
      setAuthChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);
  
  // Filters
  const todayStr = formatDateToYYYYMMDD(new Date());
  const [selectedOffice, setSelectedOffice] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('hoje');
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Perform initial auto-migration & real-time sync loop
  useEffect(() => {
    performInitialMigration().then(() => {
      fetchAllStorage().then(allData => {
        if (allData.offices) setOffices(allData.offices);
        if (allData.base_data) setBaseData(allData.base_data);
        if (allData.daily_hourly) setDailyHourly(allData.daily_hourly);
        if (allData.notes) localStorage.setItem('demands_notes_store', JSON.stringify(allData.notes));
      });
    });

    const interval = setInterval(async () => {
      const allData = await fetchAllStorage();
      if (allData.offices) setOffices(allData.offices);
      if (allData.base_data) setBaseData(allData.base_data);
      if (allData.daily_hourly) setDailyHourly(allData.daily_hourly);
      if (allData.notes) localStorage.setItem('demands_notes_store', JSON.stringify(allData.notes));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Compute effectiveBaseData dynamically combining baseData + dailyHourly
  const effectiveBaseData = getEffectiveBaseData(baseData, dailyHourly, offices);

  // Sync dates when periodFilter changes
  useEffect(() => {
    const today = new Date();
    const todayStr = formatDateToYYYYMMDD(today); // e.g. "2026-07-22"

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDateToYYYYMMDD(yesterday); // e.g. "2026-07-21"

    if (periodFilter === 'hoje') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (periodFilter === 'ontem') {
      setStartDate(yesterdayStr);
      setEndDate(yesterdayStr);
    } else if (periodFilter === '7dias') {
      const d7 = new Date(today);
      d7.setDate(d7.getDate() - 6);
      setStartDate(formatDateToYYYYMMDD(d7));
      setEndDate(todayStr);
    } else if (periodFilter === 'mes') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      setStartDate(formatDateToYYYYMMDD(firstDay));
      setEndDate(formatDateToYYYYMMDD(lastDay));
    }
  }, [periodFilter]);

  // Handle Updates
  const handleSaveOffices = (newOffices: Office[]) => {
    setOffices(newOffices);
    saveStoredOffices(newOffices);
  };

  const handleSaveBaseData = (newBaseData: BaseDataRow[]) => {
    setBaseData(newBaseData);
    saveStoredBaseData(newBaseData);
  };

  const handleSaveDailyHourly = (newDailyHourly: DailyHourlyStore) => {
    setDailyHourly(newDailyHourly);
    saveStoredDailyHourly(newDailyHourly);
    const syncedBaseData = getEffectiveBaseData(baseData, newDailyHourly, offices);
    setBaseData(syncedBaseData);
    saveStoredBaseData(syncedBaseData);
  };

  const handleDeleteBaseDataRecord = (targetRow: BaseDataRow) => {
    // 1. Remove from baseData
    const updatedBase = baseData.filter(r => !(r.data === targetRow.data && r.escritorio.toLowerCase() === targetRow.escritorio.toLowerCase()));
    
    // 2. Clear matching entries from dailyHourly
    const dateParts = targetRow.data.split('-');
    const sheetKey = dateParts.length === 3 ? `${dateParts[2]}.${dateParts[1]}` : targetRow.aba;
    const dateStr = targetRow.data;

    const newDailyHourly = { ...dailyHourly };

    let modifiedHourly = false;
    if (newDailyHourly[sheetKey] && newDailyHourly[sheetKey][targetRow.escritorio]) {
      delete newDailyHourly[sheetKey][targetRow.escritorio];
      modifiedHourly = true;
    }
    if (newDailyHourly[dateStr] && newDailyHourly[dateStr][targetRow.escritorio]) {
      delete newDailyHourly[dateStr][targetRow.escritorio];
      modifiedHourly = true;
    }

    if (modifiedHourly) {
      setDailyHourly(newDailyHourly);
      saveStoredDailyHourly(newDailyHourly);
    }

    setBaseData(updatedBase);
    saveStoredBaseData(updatedBase);
  };

  // Excel Import Handler
  const handleImportExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        if (workbook.SheetNames.includes('Base_Dados')) {
          const sheet = workbook.Sheets['Base_Dados'];
          const json: any[] = XLSX.utils.sheet_to_json(sheet);
          
          const importedRows: BaseDataRow[] = json.map(r => ({
            data: r['Data'] || new Date().toISOString().slice(0,10),
            escritorio: r['Escritório'] || 'DM9',
            aba: r['Aba'] || '01.07',
            boletos: parseFloat(r['Boletos']) || 0,
            meta_boletos: parseFloat(r['Meta Boletos/Dia']) || 500,
            contas: parseFloat(r['Contas Abertas']) || 0,
            conversao: parseFloat(r['Boletos']) > 0 ? (parseFloat(r['Contas Abertas']) || 0) / parseFloat(r['Boletos']) : 0,
            semana: parseInt(r['Semana ISO']) || 29,
            ano: parseInt(r['Ano']) || 2026,
            mes: parseInt(r['Mês']) || 7
          }));

          handleSaveBaseData(importedRows);
          alert(`Planilha importada com sucesso! ${importedRows.length} registros atualizados.`);
        } else {
          alert('Importação concluída. Certifique-se de usar o modelo de planilha gerado pela plataforma.');
        }
      } catch (err) {
        console.error(err);
        alert('Erro ao processar o arquivo Excel.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-medium">Verificando sessão...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-slate-100 flex flex-col md:flex-row antialiased selection:bg-amber-500/30 selection:text-amber-200">
      {/* Supabase Auth Modal for Unauthenticated Users */}
      {isSupabaseConfigured && !userSession && (
        <AuthModal onSuccess={() => {}} />
      )}

      {/* Header Bar Mobile Header & Controls */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#101010]/95 backdrop-blur-md border-b border-[#222222] z-40 px-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl bg-[#1C1C1C] text-slate-300 hover:text-white border border-[#262626]"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5 text-brand-yellow" />}
          </button>

          <div className="flex items-center gap-2">
            <span className="font-black text-lg tracking-wider text-white">DEMANDS</span>
          </div>
        </div>

        <span className="text-[11px] font-bold text-slate-400 bg-[#161616] px-2.5 py-1 rounded-lg border border-[#222222]">
          {activeTab === 'home' && 'Início'}
          {activeTab === 'dashboard' && 'Dashboard'}
          {activeTab === 'daily-tracker' && 'Lançamentos'}
          {activeTab === 'kanban' && 'Kanban'}
          {activeTab === 'flow-canvas' && 'Fluxos de Análise'}
          {activeTab === 'agenda' && 'Agenda'}
          {activeTab === 'notes' && 'Notas'}
          {activeTab === 'conversor-leads' && 'Conversor'}
          {activeTab === 'cruzador-blocklist' && 'Blocklist'}
          {activeTab === 'geracao-abandonadas' && 'Abandonadas'}
          {activeTab === 'reciclagem' && 'Reciclagem'}
          {activeTab === 'weekly-summary' && 'Semanal'}
          {activeTab === 'monthly-summary' && 'Mensal'}
          {activeTab === 'database' && 'Base'}
          {activeTab === 'offices-settings' && 'Escritórios'}
        </span>
      </header>

      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Viewport */}
      <main className={`flex-1 min-w-0 transition-all duration-300 p-4 md:p-6 pt-[calc(4.5rem+env(safe-area-inset-top,0px))] md:pt-6 overflow-x-hidden ${
        isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'
      }`}>
        {/* Header Filter Bar (Dashboard only) */}
        {activeTab === 'dashboard' && (
          <HeaderFilterBar
            offices={offices}
            baseData={effectiveBaseData}
            dailyHourly={dailyHourly}
            selectedOffice={selectedOffice}
            setSelectedOffice={setSelectedOffice}
            periodFilter={periodFilter}
            setPeriodFilter={setPeriodFilter}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            onExportExcel={() => exportBaseDataToExcel(effectiveBaseData, offices)}
            onImportExcel={handleImportExcel}
          />
        )}

        {/* Tab Content Routing with Smooth Fade-in Keyed Transition */}
        <div key={activeTab} className={`${activeTab === 'notes' ? '' : 'pb-12'} animate-fadeIn`}>
          {activeTab === 'home' && (
            <HomeView
              offices={offices}
              dailyHourly={dailyHourly}
              onSaveDailyHourly={handleSaveDailyHourly}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'dashboard' && (
            <DashboardView
              offices={offices}
              baseData={effectiveBaseData}
              dailyHourly={dailyHourly}
              selectedOffice={selectedOffice}
              startDate={startDate}
              endDate={endDate}
            />
          )}

          {activeTab === 'daily-tracker' && (
            <DailyTrackerView
              offices={offices}
              baseData={effectiveBaseData}
              dailyHourly={dailyHourly}
              onSaveDailyHourly={handleSaveDailyHourly}
            />
          )}

          {activeTab === 'kanban' && (
            <KanbanView />
          )}

          {activeTab === 'flow-canvas' && (
            <FlowCanvasView />
          )}

          {activeTab === 'agenda' && (
            <AgendaView onNavigateTab={setActiveTab} />
          )}

          {activeTab === 'conversor-leads' && (
            <ConversorLeadsView />
          )}

          {activeTab === 'cruzador-blocklist' && (
            <CruzadorBlocklistView />
          )}

          {activeTab === 'geracao-abandonadas' && (
            <AbandonadasView offices={offices} />
          )}

          {activeTab === 'reciclagem' && (
            <ReciclagemView />
          )}

          {activeTab === 'notes' && (
            <NotesView offices={offices} onSaveOffices={handleSaveOffices} />
          )}

          {activeTab === 'bug-report' && (
            <BugReportView 
              offices={offices} 
              isSidebarCollapsed={isSidebarCollapsed}
              onSetSidebarCollapsed={setIsSidebarCollapsed}
            />
          )}

          {activeTab === 'weekly-summary' && (
            <WeeklySummaryView
              offices={offices}
              baseData={effectiveBaseData}
            />
          )}

          {activeTab === 'monthly-summary' && (
            <MonthlySummaryView
              offices={offices}
              baseData={effectiveBaseData}
            />
          )}

          {activeTab === 'database' && (
            <DatabaseView
              offices={offices}
              baseData={effectiveBaseData}
              onUpdateBaseData={handleSaveBaseData}
              onDeleteRecord={handleDeleteBaseDataRecord}
            />
          )}

          {activeTab === 'offices-settings' && (
            <OfficeManagementView
              offices={offices}
              onSaveOffices={handleSaveOffices}
            />
          )}
        </div>
      </main>
    </div>
  );
};
