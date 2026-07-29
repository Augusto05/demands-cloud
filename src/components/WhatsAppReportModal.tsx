import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  MessageSquare, 
  ExternalLink 
} from 'lucide-react';

interface WhatsAppReportModalProps {
  reportText: string;
  onClose: () => void;
}

export const WhatsAppReportModal: React.FC<WhatsAppReportModalProps> = ({
  reportText,
  onClose
}) => {
  const [editableText, setEditableText] = useState(reportText);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(editableText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      console.error('Failed to copy text:', e);
    }
  };

  const handleOpenWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(editableText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#101010] border border-[#222222] rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#222222] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-wide">
                Report Diário das Operações
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Mensagem formatada para WhatsApp com dados de todos os escritórios
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-[#1A1A1A] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Report Text Container */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>Conteúdo do Report (editável):</span>
            {copied && (
              <span className="text-emerald-400 font-extrabold flex items-center gap-1 animate-fadeIn">
                <Check className="w-3.5 h-3.5" />
                Copiado com sucesso!
              </span>
            )}
          </div>
          <textarea
            value={editableText}
            onChange={(e) => setEditableText(e.target.value)}
            rows={12}
            className="w-full p-4 rounded-xl bg-[#080808] border border-[#222222] text-xs font-mono text-slate-200 leading-relaxed focus:outline-none focus:border-emerald-500 custom-scrollbar resize-none selection:bg-emerald-500/30"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#222222]">
          <button
            onClick={handleOpenWhatsApp}
            className="px-4 py-2.5 rounded-xl bg-[#1A1A1A] hover:bg-[#252525] border border-[#333333] text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2"
            title="Abrir no WhatsApp Web/App"
          >
            <span>Abrir WhatsApp</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </button>

          <button
            onClick={handleCopy}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-lg ${
              copied 
                ? 'bg-emerald-600 text-white border border-emerald-500 scale-105' 
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-950/50'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copiado!' : 'Copiar para o WhatsApp'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
