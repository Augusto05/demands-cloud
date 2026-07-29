import React, { useState, useEffect } from 'react';
import { X, Download, FileSpreadsheet, Info, FolderCheck } from 'lucide-react';

interface SaveFileModalProps {
  isOpen: boolean;
  suggestedFileName: string;
  fileType?: 'xlsx' | 'csv';
  onSave: (finalFileName: string) => void;
  onClose: () => void;
}

export const SaveFileModal: React.FC<SaveFileModalProps> = ({
  isOpen,
  suggestedFileName,
  fileType = 'csv',
  onSave,
  onClose
}) => {
  const [fileName, setFileName] = useState(suggestedFileName);

  useEffect(() => {
    setFileName(suggestedFileName);
  }, [suggestedFileName, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) return;

    const ext = fileType === 'xlsx' ? '.xlsx' : '.csv';
    let finalName = fileName.trim();
    if (!finalName.toLowerCase().endsWith(ext)) {
      finalName += ext;
    }

    onSave(finalName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fadeIn">
      <div className="w-full max-w-lg bg-[#101010] border border-[#222222] rounded-2xl shadow-2xl overflow-hidden space-y-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#222222] flex items-center justify-between">
          <h3 className="text-base font-extrabold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-brand-yellow" />
            <span>Salvar e Baixar Arquivo</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#161616] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-300">Nome do Arquivo *</label>
              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                fileType === 'xlsx' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              }`}>
                Formato: {fileType.toUpperCase()}
              </span>
            </div>
            <input
              type="text"
              required
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Digite o nome do arquivo..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#0A0A0A] border border-[#222222] text-sm font-bold text-white focus:outline-none focus:border-brand-yellow"
            />
          </div>

          {/* Safari Tip Box */}
          <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 space-y-1.5 text-xs text-slate-300">
            <div className="flex items-center gap-2 text-cyan-400 font-extrabold">
              <FolderCheck className="w-4 h-4 flex-shrink-0" />
              <span>Escolher a pasta de destino no Safari / Mac:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300">
              Para o Safari no macOS sempre perguntar qual pasta escolher no seu Mac, acesse no Safari:
              <br />
              <strong className="text-white">Safari &gt; Ajustes &gt; Geral &gt; Local para download de arquivos &gt; "Perguntar para cada download"</strong>.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 pb-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#161616] hover:bg-[#1F1F1F] text-xs font-bold text-slate-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-dark-900 text-xs font-extrabold shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Arquivo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
