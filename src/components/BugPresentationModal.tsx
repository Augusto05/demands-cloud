import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Building2,
  Clock,
  Layers,
  Maximize2,
  CheckCircle2,
  FileText,
  ShieldAlert,
  Bug
} from 'lucide-react';
import { BugReport } from '../types';
import { getSeverityBadge, getFrequencyLabel, getStatusBadge } from '../services/bugService';

interface BugPresentationModalProps {
  bugs: BugReport[];
  initialBugId?: string;
  onClose: () => void;
}

export const BugPresentationModal: React.FC<BugPresentationModalProps> = ({
  bugs,
  initialBugId,
  onClose
}) => {
  const initialIndex = bugs.findIndex(b => b.id === initialBugId);
  const [currentIndex, setCurrentIndex] = useState(initialIndex >= 0 ? initialIndex : 0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  const currentBug: BugReport | undefined = bugs[currentIndex];

  // Reset active image index when changing bug
  useEffect(() => {
    setActiveImageIndex(0);
    setIsImageZoomed(false);
  }, [currentIndex]);

  // Keyboard Navigation (Left / Right / Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, bugs.length]);

  if (!currentBug) return null;

  const severityBadge = getSeverityBadge(currentBug.severity);
  const statusBadge = getStatusBadge(currentBug.status);

  const handleNext = () => {
    if (currentIndex < bugs.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] bg-[#080808] text-white flex flex-col justify-between overflow-hidden animate-fadeIn select-none">
      {/* Presentation Header - 100% Mobile Responsive */}
      <header className="h-14 sm:h-16 px-3.5 sm:px-6 bg-[#101010] border-b border-[#222222] flex items-center justify-between flex-shrink-0 shadow-lg w-full">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {/* DEMANDS Logo Style Icon */}
          <div className="w-8 h-8 sm:w-[38px] sm:h-[38px] rounded-xl bg-[#1C1C1C] border border-brand-yellow/30 flex items-center justify-center text-brand-yellow flex-shrink-0 shadow-md">
            <Bug className="w-4 h-4 sm:w-5 sm:h-5 text-brand-yellow" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-base font-black tracking-wider uppercase text-white leading-tight truncate">
              Apresentação
            </h2>
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-semibold tracking-tight block truncate">
              DEMANDS
            </span>
          </div>
        </div>

        {/* Slide Counter & Close Button */}
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          <div className="bg-[#1C1C1C] px-2.5 sm:px-4 py-1.5 rounded-xl border border-[#262626] text-[11px] sm:text-xs font-mono font-bold text-slate-300">
            <span className="text-brand-yellow font-extrabold">{currentIndex + 1}</span>/<span className="text-white">{bugs.length}</span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl bg-[#1C1C1C] hover:bg-[#2A2A2A] text-slate-400 hover:text-white transition-all border border-[#262626] shadow-sm"
            title="Sair da Apresentação (Esc)"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </header>

      {/* Main Slide Content - Clean DEMANDS Neutral Cards */}
      <main className="flex-1 p-5 sm:p-6 overflow-y-auto custom-scrollbar w-full max-w-[1700px] mx-auto flex flex-col justify-between space-y-4">
        {/* Bug Header Banner */}
        <div className="bg-[#141414] p-5 rounded-2xl border border-[#222222] shadow-xl space-y-2 flex-shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* System Module & Section */}
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-brand-yellow/10 text-brand-yellow text-xs font-extrabold border border-brand-yellow/30 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-brand-yellow" />
                <span>{currentBug.systemModule}</span>
              </span>
              <span className="text-slate-600 font-bold">•</span>
              <span className="text-xs font-bold text-slate-300 font-mono">{currentBug.systemSection}</span>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <span className={`px-3.5 py-1 rounded-xl text-xs font-extrabold border ${statusBadge.bg}`}>
                {statusBadge.label}
              </span>
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug pt-1">
            {currentBug.title}
          </h1>
        </div>

        {/* 4 Impact KPI Metric Cards - Larger Typography */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
          <div className="bg-[#141414] p-4 sm:p-5 rounded-2xl border border-[#222222] space-y-1 shadow-md">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Severidade</span>
            <p className="text-xl sm:text-2xl font-black text-rose-400 uppercase tracking-tight">{severityBadge.label}</p>
          </div>

          <div className="bg-[#141414] p-4 sm:p-5 rounded-2xl border border-[#222222] space-y-1 shadow-md">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Frequência</span>
            <p className="text-base sm:text-lg font-black text-amber-300 leading-snug">{getFrequencyLabel(currentBug.frequency)}</p>
          </div>

          <div className="bg-[#141414] p-4 sm:p-5 rounded-2xl border border-[#222222] space-y-1 shadow-md">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Escritórios Afetados</span>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {currentBug.offices.length > 0 ? (
                currentBug.offices.map(off => (
                  <span key={off} className="px-2.5 py-1 rounded-lg bg-amber-400/20 text-amber-300 text-xs font-black border border-amber-400/40">
                    {off}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-400 italic">Todos os escritórios</span>
              )}
            </div>
          </div>

          <div className="bg-[#141414] p-4 sm:p-5 rounded-2xl border border-[#222222] space-y-1 shadow-md">
            <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Reportado Por</span>
            <p className="text-sm sm:text-base font-bold text-white truncate">{currentBug.reportedBy}</p>
            <span className="text-xs font-mono text-slate-400 block pt-0.5">
              {new Date(currentBug.createdAt).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>

        {/* Split Details & Image Display */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[400px]">
          {/* Left Column: Description & Reproduction Steps */}
          <div className="lg:col-span-5 space-y-3.5 flex flex-col h-full">
            <div className="bg-[#141414] p-5 rounded-2xl border border-[#222222] shadow-xl space-y-2 flex-1 flex flex-col min-h-[160px]">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-cyan-400 flex items-center gap-2 flex-shrink-0">
                <FileText className="w-4 h-4" />
                <span>Descrição do Comportamento</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium whitespace-pre-wrap flex-1 overflow-y-auto custom-scrollbar pr-1">
                {currentBug.description || 'Nenhuma descrição cadastrada.'}
              </p>
            </div>

            {currentBug.reproductionSteps && (
              <div className="bg-[#141414] p-5 rounded-2xl border border-[#222222] shadow-xl space-y-2 flex-1 flex flex-col min-h-[160px]">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-2 flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Passos para Reprodução</span>
                </h3>
                <div className="p-3.5 rounded-xl bg-[#0A0A0A] border border-[#1F1F1F] text-xs font-mono text-slate-300 leading-relaxed whitespace-pre-wrap flex-1 overflow-y-auto custom-scrollbar">
                  {currentBug.reproductionSteps}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: High-Res Screenshot Display */}
          <div className="lg:col-span-7 bg-[#141414] p-5 rounded-2xl border border-[#222222] shadow-xl flex flex-col justify-between h-full min-h-[300px]">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center justify-between pb-2 flex-shrink-0">
              <span>Evidência Visual ({currentBug.images.length})</span>
              {currentBug.images.length > 0 && (
                <span className="text-[10px] text-slate-400">Clique para ampliar tela cheia</span>
              )}
            </h3>

            {currentBug.images.length > 0 ? (
              <div className="space-y-3 flex-1 flex flex-col min-h-0">
                <div className="relative flex-1 rounded-xl border border-[#222222] bg-black overflow-hidden group">
                  <img
                    src={currentBug.images[activeImageIndex]}
                    alt="Evidência Principal"
                    className="w-full h-full object-contain cursor-pointer"
                    onClick={() => setIsImageZoomed(true)}
                  />
                  <button
                    onClick={() => setIsImageZoomed(true)}
                    className="absolute bottom-3 right-3 p-2.5 rounded-xl bg-black/80 hover:bg-black text-white text-xs font-bold transition-all border border-white/20 opacity-0 group-hover:opacity-100 flex items-center gap-1.5 shadow-lg"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>Ampliar</span>
                  </button>
                </div>

                {currentBug.images.length > 1 && (
                  <div className="flex items-center gap-2.5 overflow-x-auto custom-scrollbar p-1.5 flex-shrink-0">
                    {currentBug.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`w-16 h-12 rounded-xl border-2 overflow-hidden flex-shrink-0 transition-all ${activeImageIndex === idx
                            ? 'border-brand-yellow ring-2 ring-brand-yellow/40 shadow-lg'
                            : 'border-[#222222] opacity-50 hover:opacity-100'
                          }`}
                      >
                        <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 rounded-xl border border-dashed border-[#262626] bg-[#0A0A0A] flex flex-col items-center justify-center p-8 text-center">
                <ShieldAlert className="w-10 h-10 text-slate-600 mb-3" />
                <p className="text-xs font-bold text-slate-400">Nenhum screenshot anexado para este bug.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Presentation Bottom Navigation Bar - Responsive Mobile Footer */}
      <footer className="h-14 sm:h-16 px-3.5 sm:px-6 bg-[#101010] border-t border-[#222222] flex items-center justify-between flex-shrink-0 w-full gap-2 shadow-2xl">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="px-3 sm:px-4 py-2 rounded-xl bg-[#1C1C1C] hover:bg-[#262626] text-white disabled:opacity-30 disabled:pointer-events-none text-xs font-extrabold transition-all border border-[#262626] flex items-center justify-center gap-1 sm:gap-2 flex-1 sm:flex-initial"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Anterior</span>
        </button>

        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs text-slate-400 font-bold">Ir para:</span>
          <select
            value={currentBug.id}
            onChange={(e) => {
              const idx = bugs.findIndex(b => b.id === e.target.value);
              if (idx >= 0) setCurrentIndex(idx);
            }}
            className="px-3 py-1.5 rounded-xl bg-[#1C1C1C] border border-[#262626] text-xs font-bold text-white focus:outline-none focus:border-brand-yellow"
          >
            {bugs.map((b, i) => (
              <option key={b.id} value={b.id}>
                #{i + 1} - [{b.severity.toUpperCase()}] {b.title.substring(0, 50)}...
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleNext}
          disabled={currentIndex === bugs.length - 1}
          className="px-4 sm:px-5 py-2 rounded-xl bg-brand-yellow hover:bg-yellow-400 text-dark-900 disabled:opacity-30 disabled:pointer-events-none text-xs font-black transition-all shadow-md active:scale-95 flex items-center justify-center gap-1 sm:gap-2 flex-1 sm:flex-initial"
        >
          <span>Próximo</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </footer>

      {/* Lightbox Zoom Modal */}
      {isImageZoomed && currentBug.images[activeImageIndex] && (
        <div
          className="fixed inset-0 z-[10000] bg-black/95 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsImageZoomed(false)}
        >
          <div className="relative max-w-full max-h-[96vh] w-full h-full flex items-center justify-center">
            <img
              src={currentBug.images[activeImageIndex]}
              alt="Zoomed Screenshot"
              className="max-w-full max-h-[96vh] object-contain rounded-xl shadow-2xl border border-[#333333]"
            />
            <button
              onClick={() => setIsImageZoomed(false)}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-black/80 text-white hover:bg-black transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
};
