import React from 'react';
import { 
  Home,
  LayoutDashboard, 
  Clock, 
  CalendarRange, 
  CalendarDays, 
  Database, 
  Building2, 
  ChevronLeft,
  Wand2,
  ShieldCheck,
  PhoneOff,
  LayoutList,
  StickyNote,
  RotateCcw,
  Calendar,
  CheckSquare,
  Bug,
  Workflow
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { LogOut } from 'lucide-react';

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  onCloseMobile
}) => {
  const [currentUserEmail, setCurrentUserEmail] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          setCurrentUserEmail(data.user.email || null);
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setCurrentUserEmail(session?.user?.email || null);
      });

      return () => subscription.unsubscribe();
    }
  }, []);

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      window.location.reload();
    }
  };

  const menuSections = [
    {
      title: 'OPERAÇÕES',
      items: [
        { id: 'home', label: 'Início', icon: Home },
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'daily-tracker', label: 'Lançamento Diário', icon: Clock },
        { id: 'kanban', label: 'Kanban de Demandas', icon: LayoutList },
        { id: 'flow-canvas', label: 'Fluxos de Análise', icon: Workflow },
        { id: 'agenda', label: 'Agenda', icon: Calendar },
        { id: 'notes', label: 'Bloco de Notas', icon: StickyNote },
        { id: 'bug-report', label: 'Report de Bugs', icon: Bug },
      ]
    },
    {
      title: 'AUTOMAÇÕES',
      items: [
        { id: 'conversor-leads', label: 'Conversor de Leads', icon: Wand2 },
        { id: 'cruzador-blocklist', label: 'Cruzador Blocklist', icon: ShieldCheck },
        { id: 'geracao-abandonadas', label: 'Geração de Abandonadas', icon: PhoneOff },
        { id: 'reciclagem', label: 'Reciclagem', icon: RotateCcw },
      ]
    },
    {
      title: 'GESTÃO',
      items: [
        { id: 'weekly-summary', label: 'Resumo Semanal', icon: CalendarRange },
        { id: 'monthly-summary', label: 'Resumo Mensal', icon: CalendarDays },
        { id: 'database', label: 'Base de Dados', icon: Database },
      ]
    },
    {
      title: 'SISTEMA',
      items: [
        { id: 'offices-settings', label: 'Escritórios & Metas', icon: Building2 },
      ]
    }
  ];

  return (
    <aside className={`fixed top-0 left-0 h-screen bg-[#101010] border-r border-[#222222] transition-all duration-300 ease-in-out z-50 flex flex-col ${
      isCollapsed ? 'w-20' : 'w-64'
    } ${
      isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
    }`}>
      {/* Brand Header */}
      <div className={`h-16 px-4 flex items-center border-b border-[#222222] ${
        isCollapsed ? 'justify-center' : 'justify-between'
      }`}>
        {!isCollapsed && (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-[38px] h-[38px] rounded-xl bg-[#1C1C1C] border border-brand-yellow/30 flex items-center justify-center text-brand-yellow flex-shrink-0 shadow-md">
              <svg className="w-5 h-5 text-brand-yellow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3.5" y="3.5" width="17" height="17" rx="4" stroke="currentColor" strokeWidth="2" />
                <path d="M8.5 12.5L11 15L15.5 9" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="truncate flex flex-col justify-center">
              <span className="font-black text-xl tracking-wider text-white block leading-none truncate">DEMANDS</span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-tight block mt-1 truncate">Painel de Escritórios</span>
            </div>
          </div>
        )}

        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-xl bg-[#222222] hover:bg-[#2A2A2A] text-slate-400 hover:text-white transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center flex-shrink-0"
          title={isCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Menu Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar">
        {menuSections.map((section, idx) => (
          <div key={idx} className="space-y-1.5">
            {!isCollapsed ? (
              <h3 className="px-3 text-[10px] font-extrabold text-slate-500 tracking-widest uppercase">
                {section.title}
              </h3>
            ) : (
              idx > 0 && <div className="h-px bg-[#262626] my-3 mx-2" />
            )}

            <div className="space-y-1">
              {section.items.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      onCloseMobile?.();
                    }}
                    className={`w-full flex items-center rounded-xl text-xs font-semibold transition-all duration-200 ease-out transform ${
                      isCollapsed 
                        ? 'justify-center p-2.5' 
                        : 'justify-start gap-3 px-3 py-2.5'
                    } ${
                      isActive 
                        ? `bg-[#1C1C1C] text-brand-yellow border border-brand-yellow/30 shadow-lg font-bold ${!isCollapsed ? 'translate-x-1' : ''}` 
                        : 'text-slate-400 hover:text-white hover:bg-[#1C1C1C] border border-transparent hover:border-[#262626]'
                    }`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
                      isActive ? 'text-brand-yellow scale-110' : 'text-slate-400 group-hover:text-slate-200'
                    }`} />

                    {!isCollapsed && (
                      <span className="whitespace-nowrap truncate text-left">{item.label}</span>
                    )}

                    {isActive && !isCollapsed && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-yellow shadow-glow-yellow flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-[#222222] bg-[#101010]">
        <div className={`flex items-center gap-2.5 p-2 rounded-xl bg-[#161616] border border-[#222222] ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-extrabold flex items-center justify-center text-xs shadow-md flex-shrink-0 uppercase">
              {currentUserEmail ? currentUserEmail[0] : 'U'}
            </div>
            {!isCollapsed && (
              <div className="text-left leading-tight min-w-0">
                <span className="text-xs font-extrabold text-white block truncate" title={currentUserEmail || 'Usuário Logado'}>
                  {currentUserEmail || 'Usuário Logado'}
                </span>
                <span className="text-[9px] text-amber-400 block font-bold tracking-wider uppercase">DEMANDS CLOUD</span>
              </div>
            )}
          </div>

          {!isCollapsed && isSupabaseConfigured && currentUserEmail && (
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors flex-shrink-0"
              title="Sair da Conta"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
