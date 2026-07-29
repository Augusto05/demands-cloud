import React, { useState } from 'react';
import { 
  Building2, 
  Download, 
  Upload, 
  Calendar,
  ChevronDown,
  Check
} from 'lucide-react';
import { Office, PeriodFilter, BaseDataRow, DailyHourlyStore } from '../types';
import { WhatsAppReportModal } from './WhatsAppReportModal';
import { generateWhatsAppReportText } from '../services/whatsappReportService';

interface HeaderFilterBarProps {
  offices: Office[];
  baseData?: BaseDataRow[];
  dailyHourly?: DailyHourlyStore;
  selectedOffice: string; // 'all' or office name
  setSelectedOffice: (office: string) => void;
  periodFilter: PeriodFilter;
  setPeriodFilter: (filter: PeriodFilter) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  onExportExcel: () => void;
  onImportExcel: (file: File) => void;
}

export const HeaderFilterBar: React.FC<HeaderFilterBarProps> = ({
  offices,
  baseData = [],
  dailyHourly = {},
  selectedOffice,
  setSelectedOffice,
  periodFilter,
  setPeriodFilter,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onExportExcel,
  onImportExcel
}) => {
  const [isOfficeMenuOpen, setIsOfficeMenuOpen] = useState(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  // WhatsApp Report Modal State
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsappReportText, setWhatsappReportText] = useState('');

  const currentOfficeName = selectedOffice === 'all' 
    ? 'Geral' 
    : offices.find(o => o.name.toLowerCase() === selectedOffice.toLowerCase())?.name || selectedOffice;

  const periodLabels: Record<PeriodFilter, string> = {
    hoje: 'Hoje',
    ontem: 'Ontem',
    '7dias': '7 dias',
    mes: 'Mês',
    custom: 'Custom'
  };

  const handleOpenWhatsAppReport = () => {
    const text = generateWhatsAppReportText({
      offices,
      baseData,
      dailyHourly,
      periodFilter,
      startDate,
      endDate
    });
    setWhatsappReportText(text);
    setShowWhatsAppModal(true);
  };

  return (
    <header className="relative z-40 mb-6 space-y-2">
      {/* Mobile Compact Header Bar (lg:hidden) */}
      <div 
        onClick={() => setIsMobileExpanded(!isMobileExpanded)}
        className="lg:hidden bg-[#101010] p-3 rounded-2xl border border-[#222222] shadow-md flex items-center justify-between cursor-pointer active:bg-[#161616] transition-all"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="w-4 h-4 text-brand-yellow flex-shrink-0" />
          <span className="font-extrabold text-sm text-white truncate">{currentOfficeName}</span>
          <span className="text-[10px] font-bold text-slate-400 bg-[#161616] px-2 py-0.5 rounded-md border border-[#222222] flex-shrink-0">
            {periodLabels[periodFilter]}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsMobileExpanded(!isMobileExpanded);
          }}
          className={`px-2.5 py-1 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 ${
            isMobileExpanded 
              ? 'bg-brand-yellow text-dark-900 border-brand-yellow font-extrabold' 
              : 'bg-[#161616] text-slate-300 border-[#222222]'
          }`}
        >
          <span>{isMobileExpanded ? 'Fechar' : 'Filtros'}</span>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMobileExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Main Controls Panel */}
      <div className={`transition-all duration-500 ease-in-out flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-[#101010] shadow-xl ${
        isMobileExpanded 
          ? 'max-h-[1000px] opacity-100 p-4 border border-[#222222] rounded-2xl flex overflow-visible' 
          : 'max-h-0 opacity-0 p-0 border-0 pointer-events-none hidden lg:max-h-none lg:opacity-100 lg:p-4 lg:border lg:border-[#222222] lg:rounded-2xl lg:pointer-events-auto lg:flex lg:overflow-visible'
      }`}>
        {/* Title */}
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            Dashboard <span className="text-brand-yellow font-bold">{currentOfficeName}</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Performance operacional, métricas, variações e projeções</p>
        </div>

        {/* Controls & Filters */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
          {/* Office Selector Dropdown */}
          <div className="relative z-50">
            <button
              onClick={() => setIsOfficeMenuOpen(!isOfficeMenuOpen)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#161616] hover:bg-[#1F1F1F] border border-[#222222] text-xs font-semibold text-slate-200 transition-colors shadow-sm cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-brand-yellow" />
              <span>{currentOfficeName}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOfficeMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOfficeMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40 bg-transparent" 
                  onClick={() => setIsOfficeMenuOpen(false)} 
                />
                <div className="absolute left-0 top-full mt-2 w-56 bg-[#101010] border border-[#222222] rounded-xl shadow-2xl z-50 py-1.5 overflow-hidden ring-1 ring-black/40 animate-fadeIn">
                  <button
                    onClick={() => { setSelectedOffice('all'); setIsOfficeMenuOpen(false); }}
                    className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between hover:bg-[#161616] transition-colors ${
                      selectedOffice === 'all' ? 'text-brand-yellow bg-[#161616] font-bold' : 'text-slate-300'
                    }`}
                  >
                    <span>Geral</span>
                    {selectedOffice === 'all' && <Check className="w-3.5 h-3.5 text-brand-yellow" />}
                  </button>

                  <div className="h-px bg-[#222222] my-1" />

                  {offices.map(off => (
                    <button
                      key={off.id}
                      onClick={() => { setSelectedOffice(off.name); setIsOfficeMenuOpen(false); }}
                      className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between hover:bg-[#161616] transition-colors ${
                        selectedOffice.toLowerCase() === off.name.toLowerCase() ? 'text-brand-yellow bg-[#161616] font-bold' : 'text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: off.color }} />
                        <span>{off.name}</span>
                      </div>
                      {selectedOffice.toLowerCase() === off.name.toLowerCase() && <Check className="w-3.5 h-3.5 text-brand-yellow" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Period Filter Pill Buttons */}
          <div className="flex items-center bg-[#141414] p-1 rounded-xl border border-[#222222] text-xs max-w-full overflow-x-auto custom-scrollbar">
            {(['hoje', 'ontem', '7dias', 'mes'] as PeriodFilter[]).map(p => {
              const isActive = periodFilter === p;
              return (
                <button
                  key={p}
                  onClick={() => setPeriodFilter(p)}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
                    isActive 
                      ? 'bg-[#222222] text-white font-bold shadow-sm border border-[#333333]' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {periodLabels[p]}
                </button>
              );
            })}
          </div>

          {/* Date Inputs if Custom */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-[#141414] p-1.5 rounded-xl border border-[#222222] text-xs max-w-full overflow-x-auto">
            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1 flex-shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPeriodFilter('custom'); }}
              className="bg-transparent text-slate-200 font-medium border-none focus:outline-none text-xs w-24 sm:w-28"
            />
            <span className="text-slate-500">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPeriodFilter('custom'); }}
              className="bg-transparent text-slate-200 font-medium border-none focus:outline-none text-xs w-24 sm:w-28"
            />
          </div>

          {/* Export Excel & WhatsApp Report Trigger Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={onExportExcel}
              className="p-2.5 rounded-xl bg-[#161616] hover:bg-[#1F1F1F] border border-[#222222] text-slate-300 hover:text-white transition-colors"
              title="Exportar Excel"
            >
              <Download className="w-4 h-4" />
            </button>
            
            <button
              onClick={handleOpenWhatsAppReport}
              className="p-2.5 rounded-xl bg-[#161616] hover:bg-emerald-500/20 hover:text-emerald-400 border border-[#222222] hover:border-emerald-500/30 text-slate-300 transition-all shadow-sm"
              title="Gerar Report Diário das Operações (WhatsApp)"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* WhatsApp Report Generator Modal */}
      {showWhatsAppModal && (
        <WhatsAppReportModal
          reportText={whatsappReportText}
          onClose={() => setShowWhatsAppModal(false)}
        />
      )}
    </header>
  );
};
