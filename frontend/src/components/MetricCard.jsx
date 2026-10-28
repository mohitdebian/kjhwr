import React from 'react';

export default function MetricCard({ title, value, unit, subtitle, icon: Icon, color = 'cyan', badge }) {
  const colorMap = {
    cyan: 'border-cyan-500/30 text-cyan-400 bg-cyan-950/20',
    rose: 'border-rose-500/30 text-rose-400 bg-rose-950/20',
    emerald: 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20',
    amber: 'border-amber-500/30 text-amber-400 bg-amber-950/20',
    blue: 'border-blue-500/30 text-blue-400 bg-blue-950/20'
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-lg backdrop-blur hover:border-slate-700 transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        {Icon && (
          <div className={`p-1.5 rounded-lg border ${colorMap[color] || colorMap.cyan}`}>
            <Icon size={16} />
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold font-mono tracking-tight text-white">{value}</span>
        {unit && <span className="text-xs text-slate-400 font-mono">{unit}</span>}
        {badge && (
          <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full border border-slate-700 bg-slate-800 text-slate-300">
            {badge}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
}
