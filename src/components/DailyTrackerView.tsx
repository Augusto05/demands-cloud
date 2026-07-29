import React, { useState } from 'react';
import { 
  Clock, 
  Building2, 
  Save, 
  RotateCcw, 
  Check, 
  Sparkles, 
  TrendingUp, 
  Calculator,
  Plus,
  ChevronDown
} from 'lucide-react';
import { Office, DailyHourlyStore, BaseDataRow } from '../types';
import { calculateOfficeMetrics, formatDateToYYYYMMDD } from '../services/dataService';

interface DailyTrackerViewProps {
  offices: Office[];
  baseData?: BaseDataRow[];
  dailyHourly: DailyHourlyStore;
  onSaveDailyHourly: (newDailyHourly: DailyHourlyStore) => void;
}

// Helper to look up an office record in dailyHourly or baseData flexibly
export const getOfficeRecordForDate = (
  dateStr: string,
  officeName: string,
  dailyHourly: DailyHourlyStore,
  baseData: BaseDataRow[] = []
): { hourly: Record<number, number>; contas: number } => {
  const dParts = dateStr.split('-');
  const sheetKey = dParts.length === 3 ? `${dParts[2]}.${dParts[1]}` : dateStr;

  const storeForDate = dailyHourly[sheetKey] || dailyHourly[dateStr] || {};
  const normOfficeName = officeName.trim().toLowerCase();

  const foundKey = Object.keys(storeForDate).find(k => k.trim().toLowerCase() === normOfficeName);
  const rec = foundKey ? storeForDate[foundKey] : null;

  // Fallback to baseData for matching date and office
  const baseRow = baseData.find(r => {
    return r.data === dateStr && r.escritorio.trim().toLowerCase() === normOfficeName;
  });

  const defaultHourly = { 9: 0, 10: 0, 11: 0, 12: 0, 13: 0, 14: 0, 15: 0, 16: 0, 17: 0 };
  let finalHourly = { ...defaultHourly };
  let finalContas = 0;

  let sumHourly = 0;
  if (rec && rec.hourly) {
    finalHourly = { ...defaultHourly, ...rec.hourly };
    Object.values(finalHourly).forEach(v => sumHourly += (v || 0));
  }
  if (rec && rec.contas !== undefined && rec.contas !== null) {
    finalContas = Math.round(rec.contas);
  }

  // Fallback boletos from baseData if sumHourly is 0 and baseRow has boletos
  if (sumHourly === 0 && baseRow && baseRow.boletos > 0) {
    finalHourly[17] = baseRow.boletos;
  }

  // Fallback contas from baseData if finalContas is 0 and baseRow has contas
  if (finalContas === 0 && baseRow && baseRow.contas > 0) {
    finalContas = Math.round(baseRow.contas);
  }

  return {
    hourly: finalHourly,
    contas: finalContas
  };
};

export const DailyTrackerView: React.FC<DailyTrackerViewProps> = ({
  offices,
  baseData = [],
  dailyHourly,
  onSaveDailyHourly
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(formatDateToYYYYMMDD(new Date()));
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>(offices[0]?.id || 'dm9');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const selectedOfficeObj = offices.find(o => o.id === selectedOfficeId) || offices[0];

  const dateParts = selectedDate.split('-');
  const dateSheetName = dateParts.length === 3 ? `${dateParts[2]}.${dateParts[1]}` : selectedDate;

  // Resolve office record using normalization & fallback
  const officeHourlyObj = getOfficeRecordForDate(selectedDate, selectedOfficeObj.name, dailyHourly, baseData);

  const [hourlyRecord, setHourlyRecord] = useState<Record<number, number>>({ ...officeHourlyObj.hourly });
  const [contas, setContas] = useState<number>(officeHourlyObj.contas || 0);

  // Sync state when date or office changes
  const handleOfficeOrDateChange = (newDate: string, newOfficeId: string) => {
    setSelectedDate(newDate);
    setSelectedOfficeId(newOfficeId);
    
    const offObj = offices.find(o => o.id === newOfficeId) || offices[0];
    const rec = getOfficeRecordForDate(newDate, offObj.name, dailyHourly, baseData);

    setHourlyRecord({ ...rec.hourly });
    setContas(Math.round(rec.contas || 0));
  };

  const handleHourChange = (hour: number, val: string) => {
    const num = Math.max(0, parseInt(val) || 0);
    setHourlyRecord(prev => ({ ...prev, [hour]: num }));
  };

  const handleSave = () => {
    const updatedStore = { ...dailyHourly };
    if (!updatedStore[dateSheetName]) {
      updatedStore[dateSheetName] = {};
    }

    updatedStore[dateSheetName][selectedOfficeObj.name] = {
      hourly: hourlyRecord,
      contas: contas
    };

    onSaveDailyHourly(updatedStore);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const metrics = calculateOfficeMetrics(hourlyRecord, contas, selectedOfficeObj.dailyMeta);
  const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17];
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="p-4 sm:p-6 rounded-2xl bg-[#101010] border border-[#222222] shadow-xl space-y-3">
        {/* Mobile Compact Header (lg:hidden) */}
        <div 
          onClick={() => setIsMobileExpanded(!isMobileExpanded)}
          className="lg:hidden flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-yellow flex-shrink-0" />
            <span className="font-extrabold text-sm text-white">{selectedOfficeObj.name}</span>
            <span className="text-[10px] font-bold text-slate-400 bg-[#161616] px-2 py-0.5 rounded-md border border-[#222222]">
              {dateSheetName}
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

        {/* Full Header Controls (Always visible on Desktop, Collapsible on Mobile) */}
        <div className={`flex-col md:flex-row md:items-center justify-between gap-4 ${
          isMobileExpanded ? 'flex animate-fadeIn' : 'hidden md:flex'
        }`}>
          <div>
            <span className="text-xs font-semibold text-brand-yellow uppercase tracking-wider block">Matriz de Lançamento</span>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand-yellow" />
              <span>Acompanhamento Diário Hora a Hora (9h - 17h)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Insira a quantidade de boletos gerados por hora e veja as projeções em tempo real.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Date Selector */}
            <div className="flex items-center gap-2 bg-[#161616] px-3 py-1.5 rounded-xl border border-[#222222] text-xs">
              <span className="text-slate-400 font-medium">Data:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => handleOfficeOrDateChange(e.target.value, selectedOfficeId)}
                className="bg-transparent text-white font-bold border-none focus:outline-none cursor-pointer"
              />
            </div>

            {/* Office Buttons */}
            <div className="flex items-center bg-[#141414] p-1 rounded-xl border border-[#222222] text-xs overflow-x-auto custom-scrollbar max-w-full">
              {offices.map(off => (
                <button
                  key={off.id}
                  onClick={() => handleOfficeOrDateChange(selectedDate, off.id)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${
                    selectedOfficeId === off.id
                      ? 'bg-[#222222] text-white shadow-sm border border-[#333333]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  style={selectedOfficeId === off.id ? { color: off.color } : {}}
                >
                  {off.name}
                </button>
              ))}
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-dark-900 shadow-lg transition-all ${
                savedSuccess ? 'bg-emerald-400' : 'bg-brand-yellow hover:bg-yellow-400'
              }`}
            >
              {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{savedSuccess ? 'Salvo!' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Calculation Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <div className="p-3.5 rounded-xl bg-dark-800 border border-slate-800 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">TOTAL BOLETOS</span>
          <span className="text-xl font-black text-white">{metrics.totalBoletos.toLocaleString('pt-BR')}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-dark-800 border border-slate-800 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">MÉDIA / HORA</span>
          <span className="text-xl font-black text-cyan-400">{metrics.mediaHora.toFixed(1)}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-dark-800 border border-slate-800 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">META / HORA</span>
          <span className="text-xl font-black text-slate-300">{metrics.metaHora.toFixed(1)}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-dark-800 border border-slate-800 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">PROJ. HORA ATUAL</span>
          <span className="text-xl font-black text-amber-400">{metrics.projHoraAtual}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-dark-800 border border-slate-800 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">PROJEÇÃO / DIA</span>
          <span className="text-xl font-black text-purple-400">{Math.round(metrics.projDia).toLocaleString('pt-BR')}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-dark-800 border border-slate-800 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">GAP PROJEÇÃO</span>
          <span className={`text-xl font-black ${metrics.gapDia >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {metrics.gapDia >= 0 ? `+${Math.round(metrics.gapDia)}` : Math.round(metrics.gapDia)}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-dark-800 border border-slate-800 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">TAXA CONVERSÃO</span>
          <span className="text-xl font-black text-emerald-400">{(metrics.conversao * 100).toFixed(2)}%</span>
        </div>
      </div>

      {/* Main Hourly Input Grid Table */}
      <div className="p-6 rounded-2xl bg-dark-800/90 border border-slate-800 glass-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-cyan-400" />
            <span>Digitação Hora a Hora — {selectedOfficeObj.name} ({dateSheetName})</span>
          </h3>
          <span className="text-xs text-slate-400 font-medium">Meta Diária: <strong className="text-white">{selectedOfficeObj.dailyMeta} boletos</strong></span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">HORA</th>
                <th className="py-3 px-3">BOLETOS LANÇADOS</th>
                <th className="py-3 px-3">MÉDIA / HORA ACUM.</th>
                <th className="py-3 px-3">META / HORA</th>
                <th className="py-3 px-3">GAP HORA</th>
                <th className="py-3 px-3">PROJEÇÃO FINAL DIA</th>
                <th className="py-3 px-3">STATUS pace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {hours.map(h => {
                const bCount = hourlyRecord[h] || 0;
                const metaH = metrics.metaHora;
                const gapH = bCount - metaH;
                const isAhead = gapH >= 0;

                return (
                  <tr key={h} className="hover:bg-dark-700/40 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-white text-sm">
                      {h}:00
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={bCount === 0 ? '' : bCount}
                        onChange={(e) => handleHourChange(h, e.target.value)}
                        placeholder="0"
                        className="w-24 px-3 py-1.5 rounded-lg bg-[#0A0A0A] border border-[#222222] text-white font-extrabold focus:outline-none focus:border-brand-yellow text-base md:text-xs transition-colors"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-cyan-400 font-semibold">
                      {metrics.mediaHora.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {metaH.toFixed(1)}
                    </td>
                    <td className={`py-2.5 px-3 font-bold ${isAhead ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isAhead ? `+${gapH.toFixed(1)}` : gapH.toFixed(1)}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-purple-300">
                      {Math.round(metrics.projDia)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        bCount >= metaH ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {bCount >= metaH ? 'No Ritmo' : 'Abaixo'}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {/* Total Row */}
              <tr className="bg-[#141414] font-extrabold text-sm border-t-2 border-[#222222] text-white">
                <td className="py-3 px-3">TOTAL DIA</td>
                <td className="py-3 px-3 text-brand-yellow text-base">{metrics.totalBoletos.toLocaleString('pt-BR')}</td>
                <td className="py-3 px-3 text-cyan-400">{metrics.mediaHora.toFixed(1)}</td>
                <td className="py-3 px-3 text-slate-400">{metrics.metaHora.toFixed(1)}</td>
                <td className={`py-3 px-3 ${metrics.gapHora >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {metrics.gapHora >= 0 ? `+${metrics.gapHora.toFixed(1)}` : metrics.gapHora.toFixed(1)}
                </td>
                <td className="py-3 px-3 text-purple-400">{Math.round(metrics.projDia).toLocaleString('pt-BR')}</td>
                <td className="py-3 px-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    metrics.gapDia >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {metrics.gapDia >= 0 ? 'META ATINGIDA' : 'GAP PENDENTE'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Contas Abertas Row Entry */}
        <div className="mt-6 p-4 rounded-xl bg-[#161616] border border-[#222222] flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-white block">Contas Abertas / Convertidas no Dia</span>
            <span className="text-[11px] text-slate-400">Insira o número de contas geradas neste escritório</span>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              value={contas === 0 ? '' : contas}
              onChange={(e) => setContas(Math.max(0, parseInt(e.target.value) || 0))}
              placeholder="0"
              className="w-28 px-3 py-2 rounded-xl bg-[#0A0A0A] border border-[#222222] text-emerald-400 font-extrabold text-lg focus:outline-none focus:border-emerald-400"
            />
            <span className="text-xs text-slate-400 font-semibold">Taxa: <strong className="text-emerald-400">{(metrics.conversao * 100).toFixed(2)}%</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
