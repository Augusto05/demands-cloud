import React from 'react';
import { 
  FileText, 
  Target, 
  CheckCircle2, 
  TrendingUp, 
  UserCheck, 
  Clock, 
  BarChart3,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import { MetricCard } from './MetricCard';
import { Office, BaseDataRow, DailyHourlyStore } from '../types';
import { getSheetKeyFromDateStr, getDateStrFromSheetKey } from '../services/dataService';

interface DashboardViewProps {
  offices: Office[];
  baseData: BaseDataRow[];
  dailyHourly: DailyHourlyStore;
  selectedOffice: string;
  startDate: string;
  endDate: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  offices,
  baseData,
  dailyHourly,
  selectedOffice,
  startDate,
  endDate
}) => {
  if (offices.length === 0) {
    return (
      <div className="p-8 rounded-3xl bg-[#101010] border border-[#222222] text-center space-y-6 max-w-xl mx-auto my-12 shadow-2xl animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-lg shadow-amber-950/30">
          <BarChart3 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white tracking-wide">Nenhum Escritório Cadastrado</h2>
          <p className="text-xs text-slate-400 font-medium max-w-md mx-auto leading-relaxed">
            Cadastre seus escritórios corporativos no menu <b>Escritórios & Metas</b> para acompanhar métricas e projeções no Dashboard.
          </p>
        </div>
      </div>
    );
  }

  // Filter baseData according to selected office & date range
  const filteredRows = baseData.filter(row => {
    const matchesOffice = selectedOffice === 'all' || row.escritorio.toLowerCase() === selectedOffice.toLowerCase();
    const rowDate = row.data;
    const matchesDate = (!startDate || rowDate >= startDate) && (!endDate || rowDate <= endDate);
    return matchesOffice && matchesDate;
  });

  // Total Aggregates
  const totalBoletos = filteredRows.reduce((sum, r) => sum + r.boletos, 0);
  const totalMeta = filteredRows.reduce((sum, r) => sum + r.meta_boletos, 0);
  const totalContas = filteredRows.reduce((sum, r) => sum + r.contas, 0);
  
  const atingimentoPct = totalMeta > 0 ? (totalBoletos / totalMeta) * 100 : 0;
  const conversaoPct = totalBoletos > 0 ? (totalContas / totalBoletos) * 100 : 0;
  const gapTotal = totalBoletos - totalMeta;

  // Hourly Progress Data for Chart (aggregating across selected filter)
  const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17];
  
  // Determine matching sheet keys from selected date range
  const dateKeysToInclude: string[] = [];
  if (startDate && endDate && startDate === endDate) {
    // Single day selected (e.g., Hoje or Ontem)
    dateKeysToInclude.push(getSheetKeyFromDateStr(startDate));
  } else {
    // Range selected: find all sheet keys whose date is between startDate and endDate
    Object.keys(dailyHourly).forEach(sheetKey => {
      const dateStr = getDateStrFromSheetKey(sheetKey);
      if ((!startDate || dateStr >= startDate) && (!endDate || dateStr <= endDate)) {
        dateKeysToInclude.push(sheetKey);
      }
    });
  }

  const numberOfDays = Math.max(1, dateKeysToInclude.length);

  const hourlyChartData = hours.map(h => {
    let hourSum = 0;
    let targetSum = 0;

    offices.forEach(off => {
      if (selectedOffice === 'all' || off.name.toLowerCase() === selectedOffice.toLowerCase()) {
        dateKeysToInclude.forEach(sheetKey => {
          const offHourly = dailyHourly[sheetKey]?.[off.name]?.hourly || {};
          hourSum += offHourly[h] || 0;
        });
        targetSum += (off.dailyMeta / 9);
      }
    });

    const displayBoletos = (startDate && endDate && startDate === endDate) ? hourSum : Math.round(hourSum / numberOfDays);

    return {
      hour: `${h}h`,
      boletos: displayBoletos,
      metaHora: Math.round(targetSum),
    };
  });

  const mediaHoraCalculated = Math.round(
    hourlyChartData.reduce((s, r) => s + r.boletos, 0) / (hourlyChartData.filter(r => r.boletos > 0).length || 1)
  );

  // Office Distribution Donut Chart Data
  const officeDistribution = offices.map(off => {
    const rows = filteredRows.filter(r => r.escritorio.toLowerCase() === off.name.toLowerCase());
    const count = rows.reduce((s, r) => s + r.boletos, 0);
    return {
      name: off.name,
      value: count,
      color: off.color,
      contas: rows.reduce((s, r) => s + r.contas, 0)
    };
  }).filter(d => d.value > 0);

  const totalTabulacoes = officeDistribution.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-6">
      {/* Metric Cards Top Grid (2 columns on mobile) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
        <MetricCard
          title="TOTAL BOLETOS"
          value={totalBoletos}
          subtext="Volume acumulado"
          badge={{ text: `GAP: ${gapTotal >= 0 ? '+' : ''}${gapTotal}`, type: gapTotal >= 0 ? 'positive' : 'negative' }}
          icon={FileText}
          colorScheme="purple"
        />

        <MetricCard
          title="META DO PERÍODO"
          value={totalMeta}
          subtext="Meta combinada"
          secondaryBadge={`${filteredRows.length} dias lançados`}
          icon={Target}
          colorScheme="blue"
        />

        <MetricCard
          title="ATINGIMENTO %"
          value={`${atingimentoPct.toFixed(1)}%`}
          subtext="Progresso da meta"
          badge={{ 
            text: atingimentoPct >= 100 ? 'Meta Atingida' : 'Abaixo da Meta', 
            type: atingimentoPct >= 100 ? 'positive' : 'negative' 
          }}
          icon={CheckCircle2}
          colorScheme={atingimentoPct >= 100 ? 'green' : 'amber'}
        />

        <MetricCard
          title="CONTAS ABERTAS"
          value={totalContas}
          subtext="Novas conversões"
          secondaryBadge={`Média: ${Math.round(totalContas / (filteredRows.length || 1))}/dia`}
          icon={UserCheck}
          colorScheme="cyan"
        />

        <MetricCard
          title="TAXA CONVERSÃO"
          value={`${conversaoPct.toFixed(2)}%`}
          subtext="Contas / Boletos"
          badge={{ text: `Eficiência`, type: conversaoPct > 5 ? 'positive' : 'neutral' }}
          icon={TrendingUp}
          colorScheme="green"
        />

        <MetricCard
          title="MÉDIA POR HORA"
          value={mediaHoraCalculated}
          subtext="Ritmo atual (9h - 17h)"
          secondaryBadge="Ideal: 110/h"
          icon={Clock}
          colorScheme="amber"
        />
      </div>

      {/* Main Charts & Visualizations Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Office Distribution (Donut Chart matching image) */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-[#101010] border border-[#222222] glass-card-hover flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">Distribuição por Escritório</h2>
            </div>
            <span className="text-xs text-slate-400 font-medium bg-[#161616] px-2.5 py-1 rounded-lg">
              {filteredRows.length} Registros
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-4">
            {/* Donut Chart */}
            <div className="relative w-48 h-48 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={officeDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {officeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#101010" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#101010', borderColor: '#222222', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    formatter={(val: any) => [`${val} boletos`, 'Boletos']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-2xl font-black text-white">{totalTabulacoes.toLocaleString('pt-BR')}</span>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">TOTAL BOLETOS</span>
              </div>
            </div>

            {/* Office Legend & List */}
            <div className="flex-1 space-y-3 w-full">
              {officeDistribution.map((item, idx) => {
                const pct = totalTabulacoes > 0 ? (item.value / totalTabulacoes) * 100 : 0;
                return (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-[#161616] border border-[#222222]">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-xs font-bold text-slate-200">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-extrabold text-white">{item.value.toLocaleString('pt-BR')}</span>
                      <span className="text-[11px] font-semibold text-slate-400 w-10 text-right">{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Hourly Progress Line Chart (9h to 17h) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-[#101010] border border-[#222222] glass-card-hover flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Evolução Hora a Hora (9h - 17h)</h2>
                <p className="text-[11px] text-slate-400">Acompanhamento do ritmo horário vs linha de meta</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span className="text-slate-300 font-medium">Realizado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                <span className="text-slate-400 font-medium">Meta Hora</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBoletos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00F2FE" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00F2FE" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222222" vertical={false} />
                <XAxis dataKey="hour" stroke="#64748b" tickLine={false} tick={{ fontSize: 12 }} />
                <YAxis stroke="#64748b" tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#101010', borderColor: '#222222', borderRadius: '12px', color: '#fff' }}
                  formatter={(value: any, name: any) => [value, name === 'boletos' ? 'Boletos Realizados' : 'Meta/Hora']}
                />
                <Area type="monotone" dataKey="boletos" stroke="#00F2FE" strokeWidth={3} fillOpacity={1} fill="url(#colorBoletos)" />
                <Area type="monotone" dataKey="metaHora" stroke="#64748b" strokeWidth={2} strokeDasharray="5 5" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Office Performance & Target Progress Bars */}
      <div className="p-6 rounded-2xl bg-[#101010] border border-[#222222] glass-card-hover shadow-xl">
        <h2 className="text-base font-bold text-white tracking-tight mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-brand-yellow" />
          <span>Status de Metas por Escritório</span>
        </h2>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {offices.map((off) => {
            const rows = filteredRows.filter(r => r.escritorio.toLowerCase() === off.name.toLowerCase());
            const totalB = rows.reduce((s, r) => s + r.boletos, 0);
            const totalM = rows.reduce((s, r) => s + r.meta_boletos, 0) || off.dailyMeta;
            const pct = totalM > 0 ? Math.min(Math.round((totalB / totalM) * 100), 100) : 0;
            const isAhead = totalB >= totalM;

            return (
              <div key={off.id} className="p-4 rounded-xl bg-[#161616] border border-[#222222] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: off.color }} />
                    <span className="font-bold text-sm text-white">{off.name}</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    isAhead ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {isAhead ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {pct}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2.5 rounded-full bg-dark-900 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${pct}%`, 
                      backgroundColor: off.color,
                      boxShadow: `0 0 10px ${off.color}80` 
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Realizado: <strong className="text-white">{totalB.toLocaleString('pt-BR')}</strong></span>
                  <span>Meta: <strong className="text-slate-300">{totalM.toLocaleString('pt-BR')}</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
