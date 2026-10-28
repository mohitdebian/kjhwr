import React, { useState } from 'react';

export function WindForecastChart({ periods = [] }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!periods || periods.length === 0) {
    return <div className="h-64 flex items-center justify-center text-slate-500 text-sm">No data available</div>;
  }

  const maxVal = Math.max(...periods.map(p => Math.max(p.actualMW, p.forecastMW)), 1000);
  const minVal = 0;
  const paddingY = maxVal * 0.1;
  const topVal = maxVal + paddingY;

  const width = 800;
  const height = 300;
  const padLeft = 60;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 40;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const getX = (idx) => padLeft + (idx / (periods.length - 1)) * plotWidth;
  const getY = (val) => padTop + plotHeight - (val / topVal) * plotHeight;

  // Build SVG paths
  const actualPath = periods.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(p.actualMW)}`).join(' ');
  const forecastPath = periods.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(p.forecastMW)}`).join(' ');

  // Area under curves
  const forecastArea = `${forecastPath} L ${getX(periods.length - 1)} ${padTop + plotHeight} L ${getX(0)} ${padTop + plotHeight} Z`;

  // Y-axis gridlines
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(r => Math.round((topVal * r) / 1000) * 1000);

  const activePeriod = hoveredIdx !== null ? periods[hoveredIdx] : null;

  return (
    <div className="relative w-full overflow-hidden">
      <div className="flex items-center justify-between mb-3 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-400 rounded-full inline-block"></span>
            <span className="text-slate-300 font-medium">Actual Wind (FUELHH)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-cyan-400 rounded-full inline-block border-t border-dashed border-cyan-400"></span>
            <span className="text-slate-300 font-medium">Day-Ahead Forecast (WINDFOR)</span>
          </div>
        </div>
        {activePeriod && (
          <div className="font-mono text-xs bg-slate-800/90 border border-slate-700 px-2.5 py-1 rounded text-slate-200">
            SP {activePeriod.settlementPeriod} ({activePeriod.timeLabel}) | Act: {activePeriod.actualMW.toLocaleString()} MW | Fc: {activePeriod.forecastMW.toLocaleString()} MW | Error: <span className={activePeriod.errorMW < 0 ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-semibold'}>{activePeriod.errorMW > 0 ? `+${activePeriod.errorMW}` : activePeriod.errorMW} MW</span>
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <defs>
          <linearGradient id="fcGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Y Gridlines */}
        {yTicks.map((tick, i) => {
          const yPos = getY(tick);
          return (
            <g key={i}>
              <line x1={padLeft} y1={yPos} x2={width - padRight} y2={yPos} stroke="#1E293B" strokeDasharray="3 3" />
              <text x={padLeft - 10} y={yPos + 4} textAnchor="end" fill="#64748B" fontSize="10" fontFamily="monospace">
                {(tick / 1000).toFixed(0)}k MW
              </text>
            </g>
          );
        })}

        {/* Forecast Area */}
        <path d={forecastArea} fill="url(#fcGrad)" />

        {/* Forecast Line */}
        <path d={forecastPath} fill="none" stroke="#06B6D4" strokeWidth="2.5" strokeDasharray="5 3" />

        {/* Actuals Line */}
        <path d={actualPath} fill="none" stroke="#10B981" strokeWidth="2.5" />

        {/* X Axis Labels */}
        {periods.map((p, idx) => {
          if (idx % 6 === 0 || idx === periods.length - 1) {
            const x = getX(idx);
            return (
              <g key={idx}>
                <line x1={x} y1={padTop + plotHeight} x2={x} y2={padTop + plotHeight + 5} stroke="#334155" />
                <text x={x} y={padTop + plotHeight + 18} textAnchor="middle" fill="#64748B" fontSize="10" fontFamily="monospace">
                  {p.timeLabel}
                </text>
              </g>
            );
          }
          return null;
        })}

        {/* Hover interaction points */}
        {periods.map((p, idx) => {
          const x = getX(idx);
          const isHovered = hoveredIdx === idx;
          return (
            <g key={idx} onMouseEnter={() => setHoveredIdx(idx)} className="cursor-pointer">
              <rect
                x={x - (plotWidth / periods.length) / 2}
                y={padTop}
                width={plotWidth / periods.length}
                height={plotHeight}
                fill="transparent"
              />
              {isHovered && (
                <>
                  <line x1={x} y1={padTop} x2={x} y2={padTop + plotHeight} stroke="#94A3B8" strokeWidth="1" strokeDasharray="2 2" />
                  <circle cx={x} cy={getY(p.actualMW)} r="4" fill="#10B981" stroke="#0F172A" strokeWidth="2" />
                  <circle cx={x} cy={getY(p.forecastMW)} r="4" fill="#06B6D4" stroke="#0F172A" strokeWidth="2" />
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function ResidualDemandChart({ periods = [], demandMW = 32000 }) {
  if (!periods || periods.length === 0) return null;

  const width = 800;
  const height = 220;
  const padLeft = 60;
  const padRight = 20;
  const padTop = 15;
  const padBottom = 35;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const maxVal = Math.max(demandMW * 1.1, ...periods.map(p => Math.max(p.plannedResidualMW, p.actualResidualMW)));
  const getX = (idx) => padLeft + (idx / (periods.length - 1)) * plotWidth;
  const getY = (val) => padTop + plotHeight - (val / maxVal) * plotHeight;

  const plannedPath = periods.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(p.plannedResidualMW)}`).join(' ');
  const actualPath = periods.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(p.actualResidualMW)}`).join(' ');

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-amber-400 rounded-full inline-block"></span>
            <span className="text-slate-300 font-medium">Planned Day-Ahead Thermal Buy (Demand - Forecast)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-purple-400 rounded-full inline-block border-t border-dashed border-purple-400"></span>
            <span className="text-slate-300 font-medium">Actual Residual Needed (Demand - Actual)</span>
          </div>
        </div>
        <span className="text-slate-400 font-mono text-[11px]">Demand Baseline: {demandMW.toLocaleString()} MW</span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <line x1={padLeft} y1={getY(demandMW)} x2={width - padRight} y2={getY(demandMW)} stroke="#475569" strokeDasharray="4 4" />
        <text x={padLeft + 5} y={getY(demandMW) - 4} fill="#94A3B8" fontSize="10" fontFamily="monospace">
          Consumer Demand ({demandMW / 1000}k MW)
        </text>

        <path d={plannedPath} fill="none" stroke="#F59E0B" strokeWidth="2.5" />
        <path d={actualPath} fill="none" stroke="#A855F7" strokeWidth="2" strokeDasharray="4 2" />

        {/* X Axis */}
        {periods.map((p, idx) => {
          if (idx % 8 === 0 || idx === periods.length - 1) {
            const x = getX(idx);
            return (
              <text key={idx} x={x} y={padTop + plotHeight + 16} textAnchor="middle" fill="#64748B" fontSize="10" fontFamily="monospace">
                {p.timeLabel}
              </text>
            );
          }
          return null;
        })}
      </svg>
    </div>
  );
}

export function SettlementPeriodBarChart({ profile = [] }) {
  if (!profile || profile.length === 0) return null;

  const maxVal = Math.max(...profile.map(p => Math.max(p.maeMW, Math.abs(p.biasMW))), 500) * 1.15;
  const width = 800;
  const height = 240;
  const padLeft = 55;
  const padRight = 20;
  const padTop = 15;
  const padBottom = 35;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;
  const barWidth = Math.max(4, plotWidth / profile.length - 2);

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <line x1={padLeft} y1={padTop + plotHeight} x2={width - padRight} y2={padTop + plotHeight} stroke="#334155" />
        
        {profile.map((p, idx) => {
          const x = padLeft + idx * (plotWidth / profile.length);
          const barH = (p.maeMW / maxVal) * plotHeight;
          const y = padTop + plotHeight - barH;
          return (
            <g key={idx}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                fill={p.biasMW > 500 ? '#F43F5E' : '#06B6D4'}
                rx="1"
                opacity="0.85"
              >
                <title>{`SP ${p.settlementPeriod} (${p.timeLabel}) | MAE: ${p.maeMW} MW | Bias: ${p.biasMW} MW`}</title>
              </rect>
              {idx % 6 === 0 && (
                <text x={x + barWidth / 2} y={padTop + plotHeight + 16} textAnchor="middle" fill="#64748B" fontSize="10" fontFamily="monospace">
                  {p.timeLabel}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between items-center text-[11px] text-slate-400 mt-2 px-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-cyan-400 rounded-sm"></span> Normal MAE (MW)</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-rose-500 rounded-sm"></span> High Over-Forecast Bias (&gt;500 MW Shortfall Risk)</span>
        </div>
        <span>48 Half-Hour Settlement Periods (Jan 2026 Average)</span>
      </div>
    </div>
  );
}

export function MonthlyOverviewChart({ daily = [], onSelectDate, selectedDate }) {
  if (!daily || daily.length === 0) return null;

  const maxWape = Math.max(...daily.map(d => d.wape), 15) * 1.15;
  const width = 800;
  const height = 200;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 15;
  const padBottom = 35;
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;
  const barWidth = Math.max(6, plotWidth / daily.length - 4);

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        <line x1={padLeft} y1={padTop + plotHeight} x2={width - padRight} y2={padTop + plotHeight} stroke="#334155" />
        
        {daily.map((d, idx) => {
          const x = padLeft + idx * (plotWidth / daily.length);
          const barH = (d.wape / maxWape) * plotHeight;
          const y = padTop + plotHeight - barH;
          const isSelected = d.date === selectedDate;
          const isHighError = d.wape > 15;

          return (
            <g
              key={idx}
              onClick={() => onSelectDate && onSelectDate(d.date)}
              className="cursor-pointer group"
            >
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                fill={isSelected ? '#38BDF8' : isHighError ? '#F43F5E' : '#10B981'}
                stroke={isSelected ? '#FFFFFF' : 'none'}
                strokeWidth={isSelected ? 1.5 : 0}
                rx="2"
                opacity={isSelected ? 1 : 0.8}
              >
                <title>{`${d.date} | WAPE: ${d.wape}% | MAE: ${d.mae} MW | Click to inspect day`}</title>
              </rect>
              {idx % 3 === 0 && (
                <text x={x + barWidth / 2} y={padTop + plotHeight + 16} textAnchor="middle" fill="#64748B" fontSize="9" fontFamily="monospace">
                  {d.date.slice(8)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1 px-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span> High Accuracy (WAPE &lt; 15%)</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-rose-500 rounded-sm"></span> Volatile Miss (WAPE &ge; 15%)</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-sky-400 rounded-sm"></span> Selected Delivery Date</span>
        </div>
        <span>Click any date bar to inspect</span>
      </div>
    </div>
  );
}
