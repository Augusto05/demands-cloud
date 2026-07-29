import React, { useState, useEffect } from 'react';
import { 
  Bug, 
  Plus, 
  Search, 
  Filter, 
  Presentation, 
  AlertTriangle, 
  Building2, 
  Layers, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Eye,
  Trash2,
  Maximize2,
  RefreshCw,
  FileImage
} from 'lucide-react';
import { BugReport, BugSeverity, BugStatus, Office } from '../types';
import { 
  getStoredBugs, 
  saveStoredBugs, 
  getSeverityBadge, 
  getFrequencyLabel, 
  getStatusBadge,
  SYSTEM_MODULES
} from '../services/bugService';
import { BugReportModal } from './BugReportModal';
import { BugPresentationModal } from './BugPresentationModal';
import { getStorageItem } from '../services/syncService';

interface BugReportViewProps {
  offices: Office[];
  isSidebarCollapsed?: boolean;
  onSetSidebarCollapsed?: (collapsed: boolean) => void;
}

export const BugReportView: React.FC<BugReportViewProps> = ({ 
  offices,
  isSidebarCollapsed = false,
  onSetSidebarCollapsed
}) => {
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Ref to store sidebar state before presentation mode
  const savedSidebarStateRef = React.useRef(isSidebarCollapsed);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOfficeFilter, setSelectedOfficeFilter] = useState('all');
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState<string>('all');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');

  // Modals State
  const [editingBug, setEditingBug] = useState<BugReport | null | undefined>(undefined); // undefined = closed, null = new
  const [presentationBugId, setPresentationBugId] = useState<string | null>(null);
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);

  const handleOpenPresentation = (bugId?: string) => {
    savedSidebarStateRef.current = isSidebarCollapsed;
    onSetSidebarCollapsed?.(true);
    setPresentationBugId(bugId || null);
    setIsPresentationOpen(true);
  };

  const handleClosePresentation = () => {
    setIsPresentationOpen(false);
    onSetSidebarCollapsed?.(savedSidebarStateRef.current);
  };

  // Load bugs on mount & setup real-time sync polling with Mac disk storage
  useEffect(() => {
    async function loadData() {
      const stored = await getStoredBugs();
      setBugs(stored);
      setLoading(false);
    }
    loadData();
  }, []);

  // Sync background polling for cross-device updates
  useEffect(() => {
    const interval = setInterval(async () => {
      const remote = await getStorageItem<BugReport[]>('bugs', 'demands_bug_reports_v1', bugs);
      if (remote && JSON.stringify(remote) !== JSON.stringify(bugs)) {
        setBugs(remote);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [bugs]);

  const handleSaveBug = async (savedBug: BugReport) => {
    let updated: BugReport[];
    const exists = bugs.some(b => b.id === savedBug.id);
    if (exists) {
      updated = bugs.map(b => b.id === savedBug.id ? savedBug : b);
    } else {
      updated = [savedBug, ...bugs];
    }
    setBugs(updated);
    await saveStoredBugs(updated);
    setEditingBug(undefined);
  };

  const handleDeleteBug = async (bugId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este bug report?')) {
      const updated = bugs.filter(b => b.id !== bugId);
      setBugs(updated);
      await saveStoredBugs(updated);
      setEditingBug(undefined);
    }
  };

  const handleQuickStatusChange = async (bugId: string, newStatus: BugStatus) => {
    const updated = bugs.map(b => {
      if (b.id === bugId) {
        return { ...b, status: newStatus, updatedAt: new Date().toISOString() };
      }
      return b;
    });
    setBugs(updated);
    await saveStoredBugs(updated);
  };

  // Filter Logic
  const filteredBugs = bugs.filter(bug => {
    // Search Term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchTitle = bug.title.toLowerCase().includes(term);
      const matchDesc = bug.description.toLowerCase().includes(term);
      const matchSec = bug.systemSection.toLowerCase().includes(term);
      if (!matchTitle && !matchDesc && !matchSec) return false;
    }

    // Office Filter
    if (selectedOfficeFilter !== 'all') {
      if (!bug.offices.includes(selectedOfficeFilter)) return false;
    }

    // Severity Filter
    if (selectedSeverityFilter !== 'all') {
      if (bug.severity !== selectedSeverityFilter) return false;
    }

    // System Module Filter
    if (selectedModuleFilter !== 'all') {
      if (bug.systemModule !== selectedModuleFilter) return false;
    }

    // Status Filter
    if (selectedStatusFilter !== 'all') {
      if (bug.status !== selectedStatusFilter) return false;
    }

    return true;
  });

  // KPI Calculations
  const totalBugs = bugs.length;
  const criticalBugsOpen = bugs.filter(b => b.severity === 'critico' && b.status !== 'resolvido' && b.status !== 'arquivado').length;
  const inCorrectionCount = bugs.filter(b => b.status === 'em_correcao').length;
  const resolvedCount = bugs.filter(b => b.status === 'resolvido').length;

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Header Banner & Action Bar */}
      <div className="bg-[#101010] p-4 sm:p-6 rounded-2xl border border-[#222222] shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#222222]">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex-shrink-0">
              <Bug className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Report de Bugs & Qualidade
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Módulo completo para catalogação, screenshots, escritórios afetados e apresentação executiva.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => setEditingBug(null)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-brand-yellow hover:bg-yellow-400 text-dark-900 font-extrabold text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Bug Report</span>
            </button>
          </div>
        </div>

        {/* Top KPI Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 pt-1">
          {/* Card 1: Total Bugs */}
          <div className="bg-[#141414] p-3 sm:p-4 rounded-xl border border-[#222222] space-y-1 glass-card-hover cursor-pointer">
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Total de Bugs</span>
              <Bug className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" />
            </div>
            <p className="text-xl sm:text-3xl font-black text-white">{totalBugs}</p>
            <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate block">Registrados</span>
          </div>

          {/* Card 2: Críticos em Aberto */}
          <div className="bg-[#141414] p-3 sm:p-4 rounded-xl border border-[#222222] space-y-1 glass-card-hover cursor-pointer">
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-rose-300 font-bold uppercase tracking-wider">
              <span>Críticos Aberto</span>
              <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
            </div>
            <p className="text-xl sm:text-3xl font-black text-rose-400">{criticalBugsOpen}</p>
            <span className="text-[10px] sm:text-[11px] text-rose-300/80 font-medium truncate block">Urgência máxima</span>
          </div>

          {/* Card 3: Em Correção */}
          <div className="bg-[#141414] p-3 sm:p-4 rounded-xl border border-[#222222] space-y-1 glass-card-hover cursor-pointer">
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-indigo-300 font-bold uppercase tracking-wider">
              <span>Em Correção</span>
              <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" />
            </div>
            <p className="text-xl sm:text-3xl font-black text-indigo-400">{inCorrectionCount}</p>
            <span className="text-[10px] sm:text-[11px] text-indigo-300/80 font-medium truncate block">Sprint dev</span>
          </div>

          {/* Card 4: Resolvidos */}
          <div className="bg-[#141414] p-3 sm:p-4 rounded-xl border border-[#222222] space-y-1 glass-card-hover cursor-pointer">
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-emerald-300 font-bold uppercase tracking-wider">
              <span>Resolvidos</span>
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
            </div>
            <p className="text-xl sm:text-3xl font-black text-emerald-400">{resolvedCount}</p>
            <span className="text-[10px] sm:text-[11px] text-emerald-300/80 font-medium truncate block">Corrigidos</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar Section */}
      <div className="bg-[#101010] p-3.5 sm:p-4 rounded-2xl border border-[#222222] shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
        {/* Search Input */}
        <div className="relative flex-1 w-full max-w-none lg:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título, módulo ou erro..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#161616] border border-[#222222] text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-brand-yellow"
          />
        </div>

        {/* Filters Selectors Group - Responsive 2x2 Grid on Mobile */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 text-xs font-semibold w-full lg:w-auto">
          {/* Office Filter */}
          <div className="flex items-center gap-1 bg-[#161616] px-2.5 py-1.5 rounded-xl border border-[#222222] min-w-0">
            <Building2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <select
              value={selectedOfficeFilter}
              onChange={(e) => setSelectedOfficeFilter(e.target.value)}
              className="bg-transparent text-slate-200 font-bold focus:outline-none text-xs w-full truncate"
            >
              <option value="all" className="bg-[#101010]">Todos Escritórios</option>
              {offices.map(off => (
                <option key={off.id} value={off.name} className="bg-[#101010]">{off.name}</option>
              ))}
            </select>
          </div>

          {/* Module Filter */}
          <div className="flex items-center gap-1 bg-[#161616] px-2.5 py-1.5 rounded-xl border border-[#222222] min-w-0">
            <Layers className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
            <select
              value={selectedModuleFilter}
              onChange={(e) => setSelectedModuleFilter(e.target.value)}
              className="bg-transparent text-slate-200 font-bold focus:outline-none text-xs w-full truncate"
            >
              <option value="all" className="bg-[#101010]">Todos Módulos</option>
              {SYSTEM_MODULES.map(m => (
                <option key={m.module} value={m.module} className="bg-[#101010]">{m.module}</option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-1 bg-[#161616] px-2.5 py-1.5 rounded-xl border border-[#222222] min-w-0">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
            <select
              value={selectedSeverityFilter}
              onChange={(e) => setSelectedSeverityFilter(e.target.value)}
              className="bg-transparent text-slate-200 font-bold focus:outline-none text-xs w-full truncate"
            >
              <option value="all" className="bg-[#101010]">Todas Severidades</option>
              <option value="critico" className="bg-[#101010]">Crítico</option>
              <option value="alto" className="bg-[#101010]">Alto</option>
              <option value="medio" className="bg-[#101010]">Médio</option>
              <option value="baixo" className="bg-[#101010]">Baixo</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-[#161616] px-2.5 py-1.5 rounded-xl border border-[#222222] min-w-0">
            <Filter className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-transparent text-slate-200 font-bold focus:outline-none text-xs w-full truncate"
            >
              <option value="all" className="bg-[#101010]">Todos Status</option>
              <option value="aberto" className="bg-[#101010]">Aberto</option>
              <option value="em_analise" className="bg-[#101010]">Em Análise</option>
              <option value="em_correcao" className="bg-[#101010]">Em Correção</option>
              <option value="resolvido" className="bg-[#101010]">Resolvido</option>
              <option value="arquivado" className="bg-[#101010]">Arquivado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bug Reports Cards List Container */}
      <div className="space-y-4">
        {filteredBugs.length === 0 ? (
          <div className="bg-[#101010] p-12 rounded-2xl border border-[#222222] text-center space-y-3">
            <Bug className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-white">Nenhum Bug Report encontrado</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Ajuste os filtros de escritório, severidade ou módulo, ou cadastre um novo erro no sistema.
            </p>
            <button
              onClick={() => setEditingBug(null)}
              className="px-4 py-2 rounded-xl bg-brand-yellow text-dark-900 font-extrabold text-xs transition-all shadow-md"
            >
              Cadastrar Novo Bug
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBugs.map(bug => {
              const severityBadge = getSeverityBadge(bug.severity);
              const statusBadge = getStatusBadge(bug.status);

              return (
                <div
                  key={bug.id}
                  onClick={() => setEditingBug(bug)}
                  className="bg-[#101010] border border-[#1E1E1E] hover:border-[#383838] rounded-2xl p-4 sm:p-5 shadow-lg cursor-pointer transition-all duration-300 hover:-translate-y-1 group relative flex flex-col justify-between space-y-3.5 glass-card-hover"
                >
                  {/* Top Header: Severity + System Section + Quick Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${severityBadge.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${severityBadge.dot}`} />
                        <span>{severityBadge.label}</span>
                      </span>

                      <span className="text-[11px] font-mono text-slate-400 truncate">
                        {bug.systemSection}
                      </span>
                    </div>

                    {/* Static Status Badge */}
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg border flex-shrink-0 ${statusBadge.bg}`}>
                      {statusBadge.label}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1">
                    <h3 className="text-sm sm:text-base font-bold text-white leading-snug tracking-tight group-hover:text-amber-300 transition-colors">
                      {bug.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed font-normal">
                      {bug.description || 'Sem descrição cadastrada.'}
                    </p>
                  </div>

                  {/* Screenshots Preview (If present) */}
                  {bug.images.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <FileImage className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Evidências ({bug.images.length}):</span>
                      </span>
                      <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
                        {bug.images.slice(0, 3).map((img, idx) => (
                          <div key={idx} className="w-10 h-7 rounded-md border border-[#222222] bg-black overflow-hidden flex-shrink-0">
                            <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer Line: Office Summary & Clean Actions */}
                  <div className="pt-2 border-t border-[#181818] flex items-center justify-between gap-2">
                    {/* Office Summary */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Building2 className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="text-[11px] font-semibold text-slate-300 truncate">
                        {bug.offices.length === 4 || bug.offices.length === offices.length
                          ? 'Todos os escritórios'
                          : bug.offices.join(' • ')}
                      </span>
                    </div>

                    {/* Minimalist Action Controls */}
                    <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenPresentation(bug.id)}
                        className="px-2.5 py-1 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[11px] font-extrabold transition-all flex items-center gap-1"
                        title="Apresentar este Bug em Reunião"
                      >
                        <Presentation className="w-3.5 h-3.5" />
                        <span>Apresentar</span>
                      </button>

                      <button
                        onClick={() => handleDeleteBug(bug.id)}
                        className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                        title="Excluir Bug"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit / Create Bug Modal */}
      {editingBug !== undefined && (
        <BugReportModal
          bug={editingBug}
          offices={offices}
          onSave={handleSaveBug}
          onDelete={handleDeleteBug}
          onClose={() => setEditingBug(undefined)}
        />
      )}

      {/* Presentation Fullscreen Modal */}
      {isPresentationOpen && (
        <BugPresentationModal
          bugs={filteredBugs.length > 0 ? filteredBugs : bugs}
          initialBugId={presentationBugId || undefined}
          onClose={handleClosePresentation}
        />
      )}
    </div>
  );
};
