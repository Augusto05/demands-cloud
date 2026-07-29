import React from 'react';
import { Sparkles, X, TrendingUp, AlertTriangle, CheckCircle2, Lightbulb } from 'lucide-react';
import { AIInsight } from '../types';

interface AIInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  insights: AIInsight[];
}

export const AIInsightsModal: React.FC<AIInsightsModalProps> = ({
  isOpen,
  onClose,
  insights
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#101010] border border-[#222222] rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-6 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white shadow-lg">
              <Sparkles className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>IA Estratégica DEMANDS</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 uppercase">LIVE DIAGNOSTICS</span>
              </h2>
              <p className="text-xs text-slate-400">Análise automatizada de ritmos, projeções e gargalos de conversão.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-dark-700 hover:bg-dark-600 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Insights Cards List */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
          {insights.map(item => {
            const iconMap: Record<AIInsight['type'], React.ReactNode> = {
              positive: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
              warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
              alert: <AlertTriangle className="w-5 h-5 text-rose-400" />,
              info: <TrendingUp className="w-5 h-5 text-cyan-400" />
            };

            const borderMap: Record<AIInsight['type'], string> = {
              positive: 'border-emerald-500/20 bg-emerald-500/5',
              warning: 'border-amber-500/20 bg-amber-500/5',
              alert: 'border-rose-500/20 bg-rose-500/5',
              info: 'border-cyan-500/20 bg-cyan-500/5'
            };

            return (
              <div key={item.id} className={`p-4 rounded-xl border ${borderMap[item.type]} space-y-2`}>
                <div className="flex items-center gap-2.5">
                  {iconMap[item.type]}
                  <h3 className="font-bold text-sm text-white">{item.title}</h3>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  {item.description}
                </p>

                <div className="pt-2 flex items-start gap-2 text-xs text-purple-300 bg-dark-900/60 p-2.5 rounded-lg border border-purple-500/20 font-semibold">
                  <Lightbulb className="w-4 h-4 text-brand-yellow flex-shrink-0 mt-0.5" />
                  <span><strong>Recomendação:</strong> {item.actionableRecommendation}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition-all"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
