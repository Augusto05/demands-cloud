import React, { useState } from 'react';
import { Database, Search, Plus, Download, Trash2, Edit2, Check, X, ChevronDown } from 'lucide-react';
import { BaseDataRow, Office } from '../types';
import { exportBaseDataToExcel, getISOWeekNumber } from '../services/dataService';

interface DatabaseViewProps {
  offices: Office[];
  baseData: BaseDataRow[];
  onUpdateBaseData: (newBaseData: BaseDataRow[]) => void;
  onDeleteRecord: (row: BaseDataRow) => void;
}

export const DatabaseView: React.FC<DatabaseViewProps> = ({
  offices,
  baseData,
  onUpdateBaseData,
  onDeleteRecord
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Record Form State
  const [newData, setNewData] = useState(new Date().toISOString().slice(0,10));
  const [newEscritorio, setNewEscritorio] = useState(offices[0]?.name || 'DM9');
  const [newBoletos, setNewBoletos] = useState<number>(500);
  const [newContas, setNewContas] = useState<number>(25);

  const filteredRows = baseData.filter(row => {
    const term = searchTerm.toLowerCase();
    return row.escritorio.toLowerCase().includes(term) || row.data.includes(term) || row.aba.includes(term);
  });

  const handleAddRecord = () => {
    const d = new Date(newData + 'T12:00:00Z');
    const offObj = offices.find(o => o.name.toLowerCase() === newEscritorio.toLowerCase());
    const metaB = offObj ? offObj.dailyMeta : 500;
    const dateParts = newData.split('-');
    const abaStr = dateParts.length === 3 ? `${dateParts[2]}.${dateParts[1]}` : '01.07';

    const newRow: BaseDataRow = {
      data: newData,
      escritorio: newEscritorio,
      aba: abaStr,
      boletos: newBoletos,
      meta_boletos: metaB,
      contas: newContas,
      conversao: newBoletos > 0 ? newContas / newBoletos : 0,
      semana: getISOWeekNumber(d),
      ano: d.getFullYear(),
      mes: d.getMonth() + 1
    };

    onUpdateBaseData([newRow, ...baseData]);
    setShowAddModal(false);
  };

  const handleDeleteRecord = (targetRow: BaseDataRow) => {
    if (confirm(`Tem certeza que deseja excluir o registro de ${targetRow.escritorio} do dia ${targetRow.data}?`)) {
      onDeleteRecord(targetRow);
    }
  };

  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#101010] border border-[#222222] shadow-xl space-y-3">
        {/* Mobile Compact Bar (lg:hidden) */}
        <div 
          onClick={() => setIsMobileExpanded(!isMobileExpanded)}
          className="lg:hidden flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="font-extrabold text-sm text-white">Base Histórica</span>
            <span className="text-[10px] font-bold text-slate-400 bg-[#161616] px-2 py-0.5 rounded-md border border-[#222222]">
              {baseData.length} recs
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
            <span>{isMobileExpanded ? 'Fechar' : 'Opções'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMobileExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Full Header Controls */}
        <div className={`flex-col md:flex-row md:items-center justify-between gap-4 ${
          isMobileExpanded ? 'flex animate-fadeIn' : 'hidden md:flex'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Base de Dados Histórica</h2>
              <p className="text-xs text-slate-400">Total de {baseData.length} registros diários consolidados.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por escritório ou data..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-4 py-2 rounded-xl bg-[#161616] border border-[#222222] text-slate-200 text-xs font-medium focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-dark-900 font-extrabold text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-amber-950/40"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Registro</span>
            </button>

            <button
              onClick={() => exportBaseDataToExcel(baseData, offices)}
              className="p-2 rounded-xl bg-[#161616] hover:bg-[#1F1F1F] border border-[#222222] text-slate-300 hover:text-white transition-colors"
              title="Exportar Excel"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl bg-[#101010] border border-[#222222] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#141414] text-slate-400 uppercase text-[10px] tracking-wider border-b border-[#222222]">
              <tr>
                <th className="py-3.5 px-4 font-bold">DATA</th>
                <th className="py-3.5 px-4 font-bold">ESCRITÓRIO</th>
                <th className="py-3.5 px-4 font-bold">ABA DO DIA</th>
                <th className="py-3.5 px-4 font-bold">BOLETOS</th>
                <th className="py-3.5 px-4 font-bold">META/DIA</th>
                <th className="py-3.5 px-4 font-bold">CONTAS ABERTAS</th>
                <th className="py-3.5 px-4 font-bold">CONVERSÃO</th>
                <th className="py-3.5 px-4 font-bold">SEMANA ISO</th>
                <th className="py-3.5 px-4 font-bold">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredRows.map((row, idx) => (
                <tr key={`${row.data}_${row.escritorio}_${idx}`} className="hover:bg-dark-700/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">{row.data}</td>
                  <td className="py-3.5 px-4">
                    <span className="font-extrabold text-slate-200">{row.escritorio}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">{row.aba}</td>
                  <td className="py-3.5 px-4 text-purple-300 font-extrabold">{row.boletos.toLocaleString('pt-BR')}</td>
                  <td className="py-3.5 px-4 text-slate-400">{row.meta_boletos.toLocaleString('pt-BR')}</td>
                  <td className="py-3.5 px-4 text-emerald-400 font-extrabold">{row.contas.toLocaleString('pt-BR')}</td>
                  <td className="py-3.5 px-4 font-bold text-cyan-400">{(row.conversao * 100).toFixed(2)}%</td>
                  <td className="py-3.5 px-4 text-slate-400">Semana {row.semana}</td>
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => handleDeleteRecord(row)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Record Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#101010] border border-[#222222] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#222222] pb-3">
              <h3 className="text-base font-bold text-white">Adicionar Novo Registro Histórico</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Data</label>
                <input
                  type="date"
                  value={newData}
                  onChange={(e) => setNewData(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0A0A] border border-[#222222] text-white font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Escritório</label>
                <select
                  value={newEscritorio}
                  onChange={(e) => setNewEscritorio(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0A0A] border border-[#222222] text-white font-bold focus:outline-none"
                >
                  {offices.map(o => (
                    <option key={o.id} value={o.name}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Total Boletos Realizados</label>
                <input
                  type="number"
                  value={newBoletos}
                  onChange={(e) => setNewBoletos(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0A0A] border border-[#222222] text-purple-300 font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">Contas Abertas / Convertidas</label>
                <input
                  type="number"
                  value={newContas}
                  onChange={(e) => setNewContas(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-[#0A0A0A] border border-[#222222] text-emerald-400 font-bold focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#222222]">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 rounded-xl bg-[#161616] text-slate-300 text-xs font-bold hover:bg-[#1F1F1F]"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddRecord}
                className="px-4 py-2 rounded-xl bg-brand-yellow text-dark-900 text-xs font-bold hover:bg-yellow-400"
              >
                Salvar Registro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
