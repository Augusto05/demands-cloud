import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  badge?: {
    text: string;
    type?: 'positive' | 'negative' | 'neutral' | 'info';
  };
  secondaryBadge?: string;
  icon: LucideIcon;
  colorScheme: 'purple' | 'cyan' | 'green' | 'amber' | 'pink' | 'blue';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtext,
  badge,
  secondaryBadge,
  icon: Icon,
  colorScheme
}) => {
  const colorMap = {
    purple: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20 hover:border-purple-500/40',
      iconBg: 'bg-purple-500/20 text-purple-400',
      glow: 'group-hover:shadow-glow-purple',
    },
    cyan: {
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/20 hover:border-cyan-500/40',
      iconBg: 'bg-cyan-500/20 text-cyan-400',
      glow: 'group-hover:shadow-glow-cyan',
    },
    green: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      iconBg: 'bg-emerald-500/20 text-emerald-400',
      glow: 'group-hover:shadow-glow-green',
    },
    amber: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20 hover:border-amber-500/40',
      iconBg: 'bg-amber-500/20 text-amber-400',
      glow: 'group-hover:shadow-glow-yellow',
    },
    pink: {
      bg: 'bg-pink-500/10',
      border: 'border-pink-500/20 hover:border-pink-500/40',
      iconBg: 'bg-pink-500/20 text-pink-400',
      glow: '',
    },
    blue: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20 hover:border-blue-500/40',
      iconBg: 'bg-blue-500/20 text-blue-400',
      glow: '',
    }
  };

  const scheme = colorMap[colorScheme] || colorMap.purple;

  return (
    <div className="group relative p-3.5 sm:p-5 rounded-2xl bg-[#101010] border border-[#222222] transition-all duration-200 glass-card-hover cursor-pointer hover:-translate-y-1 hover:border-[#333333] shadow-lg flex flex-col justify-between">
      {/* Header Row */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-400 uppercase truncate">
          {title}
        </span>
        <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${scheme.iconBg}`}>
          <Icon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
        </div>
      </div>

      {/* Main Metric Value */}
      <div className="mb-2">
        <span className="text-2xl sm:text-3xl font-black text-white tracking-tight block truncate">
          {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
        </span>
        {subtext && (
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-400 block mt-0.5 truncate">
            {subtext}
          </span>
        )}
      </div>

      {/* Footer Badges */}
      {(badge || secondaryBadge) && (
        <div className="flex items-center flex-wrap gap-1.5 pt-1">
          {badge && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold truncate ${
              badge.type === 'positive' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
              badge.type === 'negative' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
              badge.type === 'info' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
              'bg-[#161616] text-slate-300 border border-[#222222]'
            }`}>
              {badge.text}
            </span>
          )}

          {secondaryBadge && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-[#161616] text-slate-300 border border-[#222222] truncate">
              {secondaryBadge}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
