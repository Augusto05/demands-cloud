import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Upload, 
  Trash2, 
  AlertTriangle, 
  Building2, 
  Layers, 
  Clock, 
  User, 
  Check,
  Maximize2,
  FileText
} from 'lucide-react';
import { BugReport, BugSeverity, BugFrequency, BugStatus, Office } from '../types';
import { SYSTEM_MODULES, getSeverityBadge } from '../services/bugService';

interface BugReportModalProps {
  bug: BugReport | null; // null if creating
  offices: Office[];
  onSave: (savedBug: BugReport) => void;
  onDelete?: (bugId: string) => void;
  onClose: () => void;
}

export const BugReportModal: React.FC<BugReportModalProps> = ({
  bug,
  offices,
  onSave,
  onDelete,
  onClose
}) => {
  const defaultOfficeNames = offices.length > 0 ? offices.map(o => o.name) : ['DM9', 'Aliança Sul', 'Celebra', 'M10'];

  const [title, setTitle] = useState(bug?.title || '');
  const [description, setDescription] = useState(bug?.description || '');
  const [reproductionSteps, setReproductionSteps] = useState(bug?.reproductionSteps || '');
  const [systemSection, setSystemSection] = useState(bug?.systemSection || SYSTEM_MODULES[0].sections[0]);
  const [severity, setSeverity] = useState<BugSeverity>(bug?.severity || 'critico');
  const [frequency, setFrequency] = useState<BugFrequency>(bug?.frequency || 'sempre_100');
  const [selectedOffices, setSelectedOffices] = useState<string[]>(bug?.offices || defaultOfficeNames);
  const [status, setStatus] = useState<BugStatus>(bug?.status || 'aberto');
  const [reportedBy, setReportedBy] = useState(bug?.reportedBy || 'Augusto (Admin)');
  const [images, setImages] = useState<string[]>(bug?.images || []);

  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Determine systemModule from systemSection
  const findModuleForSection = (section: string): string => {
    for (const cat of SYSTEM_MODULES) {
      if (cat.sections.includes(section)) return cat.module;
    }
    return 'GERAL';
  };

  const handleToggleOffice = (offName: string) => {
    if (selectedOffices.includes(offName)) {
      setSelectedOffices(selectedOffices.filter(o => o !== offName));
    } else {
      setSelectedOffices([...selectedOffices, offName]);
    }
  };

  const handleToggleAllOffices = () => {
    if (selectedOffices.length === defaultOfficeNames.length) {
      setSelectedOffices([]);
    } else {
      setSelectedOffices([...defaultOfficeNames]);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result && typeof reader.result === 'string') {
            setImages(prev => [...prev, reader.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Handle Clipboard Paste Event (Ctrl+V / Cmd+V)
  React.useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onloadend = () => {
              if (reader.result && typeof reader.result === 'string') {
                setImages(prev => [...prev, reader.result as string]);
              }
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const saved: BugReport = {
      id: bug ? bug.id : `bug-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      reproductionSteps: reproductionSteps.trim() || undefined,
      systemSection,
      systemModule: findModuleForSection(systemSection),
      severity,
      frequency,
      offices: selectedOffices,
      images,
      status,
      reportedBy: reportedBy.trim() || 'Augusto (Admin)',
      createdAt: bug ? bug.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSave(saved);
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-3xl bg-[#101010] border border-[#222222] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#222222] flex items-center justify-between bg-[#141414]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <span>{bug ? 'Editar Bug Report' : 'Novo Bug Report'}</span>
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">Cadastre detalhes, severidade e evidências visuais do erro</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-[#1C1C1C] hover:bg-[#262626] text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {/* Title */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Título do Erro / Bug *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Falha na validação de impeditivos C6 ao importar lote..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#080808] border border-[#222222] text-sm font-bold text-white focus:outline-none focus:border-rose-500 transition-colors"
            />
          </div>

          {/* Grid 2 Columns: System Section & Severity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* System Section Dropdown */}
            <div>
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
                <Layers className="w-3.5 h-3.5 text-brand-yellow" />
                <span>Seção do Sistema *</span>
              </label>
              <select
                value={systemSection}
                onChange={(e) => setSystemSection(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080808] border border-[#222222] text-xs font-bold text-white focus:outline-none focus:border-brand-yellow"
              >
                {SYSTEM_MODULES.map(cat => (
                  <optgroup key={cat.module} label={`--- ${cat.module} ---`}>
                    {cat.sections.map(sec => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Severity Pills */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Nível de Severidade *
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['critico', 'alto', 'medio', 'baixo'] as BugSeverity[]).map(sev => {
                  const badge = getSeverityBadge(sev);
                  const isSelected = severity === sev;
                  return (
                    <button
                      type="button"
                      key={sev}
                      onClick={() => setSeverity(sev)}
                      className={`px-2 py-2 rounded-xl text-[10px] font-extrabold uppercase transition-all border text-center ${
                        isSelected 
                          ? `${badge.bg} ring-2 ring-rose-500/30 scale-[1.02]` 
                          : 'bg-[#080808] text-slate-400 border-[#222222] hover:border-slate-600'
                      }`}
                    >
                      {badge.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Grid 2 Columns: Frequency & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Frequency Selector */}
            <div>
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Frequência de Ocorrência *</span>
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as BugFrequency)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080808] border border-[#222222] text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="sempre_100">Sempre ocorre (100% das vezes)</option>
                <option value="duas_cinco">Ocorreu de 2 a 5 vezes</option>
                <option value="uma_vez">Ocorreu apenas 1 vez</option>
                <option value="intermitente">Intermitente (Erro aleatório)</option>
              </select>
            </div>

            {/* Status Selector */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Status da Demanda
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as BugStatus)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#080808] border border-[#222222] text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="aberto">Aberto</option>
                <option value="em_analise">Em Análise</option>
                <option value="em_correcao">Em Correção</option>
                <option value="resolvido">Resolvido</option>
                <option value="arquivado">Arquivado</option>
              </select>
            </div>
          </div>

          {/* Offices Multi-Select Pills */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Escritórios Afetados *</span>
              </label>
              <button
                type="button"
                onClick={handleToggleAllOffices}
                className="text-[10px] font-bold text-amber-400 hover:text-amber-300 uppercase tracking-wider"
              >
                {selectedOffices.length === defaultOfficeNames.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {defaultOfficeNames.map(offName => {
                const isSelected = selectedOffices.includes(offName);
                return (
                  <button
                    type="button"
                    key={offName}
                    onClick={() => handleToggleOffice(offName)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all border flex items-center gap-1.5 ${
                      isSelected 
                        ? 'bg-amber-400 text-dark-900 border-amber-400 shadow-md scale-[1.02]' 
                        : 'bg-[#080808] text-slate-400 border-[#222222] hover:border-slate-600'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    <span>{offName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description Textarea */}
          <div>
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Descrição Completa do Erro</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o comportamento inesperado, mensagens de erro exibidas..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#080808] border border-[#222222] text-xs font-medium text-white focus:outline-none focus:border-cyan-500 custom-scrollbar"
            />
          </div>

          {/* Steps to Reproduce */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Passos para Reproduzir (Opcional)
            </label>
            <textarea
              rows={2}
              value={reproductionSteps}
              onChange={(e) => setReproductionSteps(e.target.value)}
              placeholder="1. Acessar tela X... 2. Clicar no botão Y..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#080808] border border-[#222222] text-xs font-mono text-slate-300 focus:outline-none focus:border-slate-500 custom-scrollbar"
            />
          </div>

          {/* Image Attachments Upload */}
          <div>
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between mb-1.5">
              <span>Evidências Visuais (Screenshots / Imagens)</span>
              <span className="text-[10px] text-slate-400 font-normal">({images.length} anexadas)</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {images.map((img, idx) => (
                <div key={idx} className="relative group rounded-xl border border-[#222222] bg-black overflow-hidden h-24 shadow-md">
                  <img src={img} alt={`Evidência ${idx + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => setZoomedImage(img)}
                      className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                      title="Ver em tamanho real"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-500 transition-colors"
                      title="Remover imagem"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Upload Card Button */}
              <label className="border border-dashed border-[#333333] hover:border-brand-yellow bg-[#080808] hover:bg-[#121212] rounded-xl h-24 flex flex-col items-center justify-center p-2 gap-1 cursor-pointer transition-all text-center">
                <Upload className="w-4 h-4 text-brand-yellow" />
                <span className="text-[10px] font-bold text-slate-200">Anexar ou Colar</span>
                <span className="text-[9px] font-mono text-amber-400">Ctrl+V / Cmd+V</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Reporter Input */}
          <div className="pt-2">
            <label className="text-xs font-bold text-slate-400 block mb-1">Reportado Por</label>
            <input
              type="text"
              value={reportedBy}
              onChange={(e) => setReportedBy(e.target.value)}
              className="w-full sm:w-64 px-3 py-1.5 rounded-xl bg-[#080808] border border-[#222222] text-xs font-bold text-white"
            />
          </div>
        </form>

        {/* Footer Actions - Responsive Stack on Mobile */}
        <div className="px-4 sm:px-5 py-3 sm:py-3.5 bg-[#141414] border-t border-[#222222] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          {bug && onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(bug.id)}
              className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Excluir Bug</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 sm:py-2 rounded-xl bg-[#1C1C1C] hover:bg-[#262626] text-slate-300 text-xs font-bold transition-colors text-center"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 sm:flex-initial px-5 py-2.5 sm:py-2 rounded-xl bg-brand-yellow hover:bg-yellow-400 text-dark-900 text-xs font-extrabold transition-all shadow-md active:scale-95 text-center"
            >
              {bug ? 'Salvar Alterações' : 'Criar Bug Report'}
            </button>
          </div>
        </div>
      </div>

      {/* Image Zoom Lightbox */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl border border-[#333333]">
            <img src={zoomedImage} alt="Evidência Zoom" className="w-full h-full object-contain" />
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/70 text-white hover:bg-black transition-colors"
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
