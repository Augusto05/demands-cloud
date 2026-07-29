import React from 'react';
import { CalendarDays, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Office, BaseDataRow } from '../types';
import { calculateMonthlySummary } from '../services/dataService';

interface MonthlySummaryViewProps {
  offices: Office[];
  baseData: BaseDataRow[];
}

export const MonthlySummaryView: React.FC<MonthlySummaryViewProps> = ({
  offices,
  baseData
}) => {
  if (offices.length === 0) {
    return (
      <div className="p-8 rounded-3xl bg-[#101010] border border-[#222222] text-center space-y-4 max-w-xl mx-auto my-12 shadow-2xl animate-fadeIn">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
          <CalendarDays className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white">Nenhum Escritório Cadastrado</h2>
        <p className="text-xs text-slate-400 leading-relaxed font-medium">
          Cadastre seus escritórios no menu <b>Escritórios & Metas</b> para acompanhar o resumo mensal comparativo.
        </p>
      </div>
    );
  }

  const monthlyData = calculateMonthlySummary(baseData, offices);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-dark-800 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Resumo Mensal — Médias Diárias Comparativas</h2>
            <p className="text-xs text-slate-400">Comparação das médias diárias do mês atual em relação ao mês anterior.</p>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="p-6 rounded-2xl bg-dark-800 border border-slate-800 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-4 font-bold">ESCRITÓRIO</th>
                <th className="py-3.5 px-4 font-bold">MÉDIA BOLETOS/DIA MÊS ATUAL</th>
                <th className="py-3.5 px-4 font-bold">MÉDIA BOLETOS/DIA MÊS ANTERIOR</th>
                <th className="py-3.5 px-4 font-bold">VARIAÇÃO %</th>
                <th className="py-3.5 px-4 font-bold">MÉDIA CONTAS/DIA MÊS ATUAL</th>
                <th className="py-3.5 px-4 font-bold">MÉDIA CONTAS/DIA MÊS ANTERIOR</th>
                <th className="py-3.5 px-4 font-bold">VARIAÇÃO %</th>
                <th className="py-3.5 px-4 font-bold">CONVERSÃO MÉDIA ATUAL</th>
                <th className="py-3.5 px-4 font-bold">CONVERSÃO MÉDIA ANTERIOR</th>
                <th className="py-3.5 px-4 font-bold">VARIAÇÃO (P.P.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {monthlyData.map((row, idx) => {
                const isTotal = row.escritorio === 'TOTAL';
                const isBolUp = row.variacaoBoletosPct >= 0;
                const isContasUp = row.variacaoContasPct >= 0;
                const isPPUp = row.variacaoConversaoPP >= 0;

                return (
                  <tr key={idx} className={`hover:bg-[#161616] transition-colors ${isTotal ? 'bg-[#141414] font-black text-sm border-t-2 border-[#222222] text-white' : 'text-slate-200'}`}>
                    <td className="py-4 px-4 font-bold text-white flex items-center gap-2">
                      {!isTotal && <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />}
                      <span>{row.escritorio}</span>
                    </td>
                    
                    <td className="py-4 px-4 text-purple-300 font-extrabold">{row.mediaBoletosAtual.toFixed(1)}</td>
                    <td className="py-4 px-4 text-slate-400">{row.mediaBoletosAnterior.toFixed(1)}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1 font-bold ${isBolUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isBolUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        {(row.variacaoBoletosPct * 100).toFixed(1)}%
                      </span>
                    </td>

                    <td className="py-4 px-4 text-cyan-300 font-extrabold">{row.mediaContasAtual.toFixed(1)}</td>
                    <td className="py-4 px-4 text-slate-400">{row.mediaContasAnterior.toFixed(1)}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1 font-bold ${isContasUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isContasUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        {(row.variacaoContasPct * 100).toFixed(1)}%
                      </span>
                    </td>

                    <td className="py-4 px-4 text-emerald-400 font-extrabold">{(row.conversaoMediaAtual * 100).toFixed(2)}%</td>
                    <td className="py-4 px-4 text-slate-400">{(row.conversaoMediaAnterior * 100).toFixed(2)}%</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full ${
                        isPPUp ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {isPPUp ? '+' : ''}{(row.variacaoConversaoPP * 100).toFixed(2)} p.p.
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
