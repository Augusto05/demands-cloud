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

import { AppLogo } from './AppLogo';

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  onCloseMobile
}) => {
  const currentUsername = localStorage.getItem('demands_current_username') || 'admin';
  const currentDisplayName = localStorage.getItem('demands_current_name') || (currentUsername === 'admin' ? 'Administrador' : currentUsername);

  const handleLogout = async () => {
    localStorage.removeItem('demands_auth_active');
    localStorage.removeItem('demands_current_username');
    localStorage.removeItem('demands_current_name');
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {}
    }
    window.location.reload();
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
    <aside className={`fixed top-0 left-0 h-screen bg-[#0D0D0D] border-r border-[#1F1F1F] transition-all duration-300 ease-in-out z-50 flex flex-col ${
      isCollapsed ? 'w-20' : 'w-64'
    } ${
      isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
    }`}>
      {/* Brand Header */}
      <div className={`h-20 px-4 flex items-center border-b border-[#1F1F1F] ${
        isCollapsed ? 'justify-center' : 'justify-between'
      }`}>
        {!isCollapsed && (
          <AppLogo size="md" />
        )}

        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-8 h-8 rounded-full bg-[#1E1E1E] hover:bg-[#282828] border border-[#2B2B2B] text-slate-400 hover:text-white transition-all flex items-center justify-center flex-shrink-0 cursor-pointer active:scale-95 shadow-md"
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
              <h3 className="px-3 text-[11px] font-extrabold text-slate-500 tracking-widest uppercase">
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
                    className={`w-full flex items-center rounded-2xl text-xs font-bold transition-all duration-200 ease-out ${
                      isCollapsed 
                        ? 'justify-center p-3' 
                        : 'justify-start gap-3 px-3.5 py-3'
                    } ${
                      isActive 
                        ? 'bg-[#141414] text-[#FACC15] border border-[#EAB308]/80 shadow-lg shadow-amber-950/20' 
                        : 'text-slate-400 hover:text-white hover:bg-[#141414] border border-transparent hover:border-[#222222]'
                    }`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className={`w-4 h-4 min-w-[16px] min-h-[16px] flex-shrink-0 transition-transform duration-200 ${
                      isActive ? 'text-[#FACC15] scale-105' : 'text-slate-400 group-hover:text-slate-200'
                    }`} />

                    {!isCollapsed && (
                      <span className="whitespace-nowrap truncate text-left">{item.label}</span>
                    )}

                    {isActive && !isCollapsed && (
                      <span className="ml-auto w-2 h-2 rounded-full bg-[#FACC15] shadow-glow-yellow flex-shrink-0" />
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
            <div className="w-8 h-8 rounded-xl bg-[#FACC15] text-slate-950 font-black flex items-center justify-center text-xs shadow-md flex-shrink-0 uppercase">
              {currentDisplayName ? currentDisplayName[0] : 'A'}
            </div>
            {!isCollapsed && (
              <div className="text-left leading-tight min-w-0">
                <span className="text-xs font-extrabold text-white block truncate" title={currentDisplayName}>
                  {currentDisplayName}
                </span>
                <span className="text-[9px] text-[#FACC15] block font-extrabold tracking-wider uppercase">DEMANDS</span>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors flex-shrink-0 cursor-pointer"
              title="Sair da Conta (Deslogar)"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
