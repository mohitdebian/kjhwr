import React, { useState } from 'react';
import { Wind, Activity, Zap, TrendingUp, AlertTriangle, ShieldCheck, Download, Filter } from 'lucide-react';
import MetricCard from './MetricCard';
import { WindForecastChart, ResidualDemandChart } from './Charts';

export default function DecisionDesk({
  dayData,
  loading,
  selectedDate,
  setSelectedDate,
  availableDates = [],
  gateClosureHour,
  setGateClosureHour,
  demandMW,
  setDemandMW
}) {
  const [filterRisk, setFilterRisk] = useState('ALL');

  if (loading && !dayData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 gap-3">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm">Calculating Day-Ahead Market Position...</span>
      </div>
    );
  }

  const metrics = dayData?.metrics || {};
  const periods = dayData?.periods || [];

  const filteredPeriods = periods.filter(p => {
    if (filterRisk === 'ALL') return true;
    return p.imbalanceRisk === filterRisk;
  });

  const exportCSV = () => {
    if (!periods.length) return;
    const headers = ["SettlementPeriod,StartTime,Actual_MW,Forecast_MW,Error_MW,PlannedThermal_MW,Risk"];
    const rows = periods.map(p =>
      `${p.settlementPeriod},"${p.startTime}",${p.actualMW},${p.forecastMW},${p.errorMW},${p.plannedResidualMW},${p.imbalanceRisk}`
    );
    const blob = new Blob([headers.concat(rows).join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Wind_DayAhead_${selectedDate}_Gate${gateClosureHour}h.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Top Interactive Controls Panel */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Target Delivery Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Target Delivery Day (Jan 2026)
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 font-mono focus:outline-none focus:border-cyan-500"
            >
              {availableDates.map(d => (
                <option key={d} value={d}>
                  {d} {d === '2026-01-15' ? '(Mid-Month Baseline)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Day-Ahead Gate Closure Time */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                D-1 Gate Closure Time
              </label>
              <span className="text-xs font-mono font-semibold text-cyan-400">
                {gateClosureHour.toString().padStart(2, '0')}:00 GMT (D-1)
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="23"
              value={gateClosureHour}
              onChange={(e) => setGateClosureHour(parseInt(e.target.value))}
              className="w-full accent-cyan-500 bg-slate-800 rounded-lg cursor-pointer h-2"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
              <span>00:00 (Early)</span>
              <span className="text-cyan-400 font-bold">11:00 (EPEX Auction)</span>
              <span>23:00 (Intraday)</span>
            </div>
          </div>

          {/* Consumer Demand Baseline */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Target Consumer Load
              </label>
              <span className="text-xs font-mono font-semibold text-amber-400">
                {(demandMW / 1000).toFixed(1)}k MW
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="20000"
                max="45000"
                step="1000"
                value={demandMW}
                onChange={(e) => setDemandMW(parseFloat(e.target.value))}
                className="w-full accent-amber-500 bg-slate-800 rounded-lg cursor-pointer h-2"
              />
              <button
                onClick={() => setDemandMW(32000)}
                className="text-[11px] px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 whitespace-nowrap"
              >
                Reset
              </button>
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
              <span>20k Off-peak</span>
              <span>32k Base</span>
              <span>45k Winter Peak</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Day MAE"
          value={metrics.mae?.toLocaleString() ?? '-'}
          unit="MW"
          subtitle="Mean Absolute Error per 30-min"
          icon={Activity}
          color="cyan"
        />
        <MetricCard
          title="Forecast Bias (ME)"
          value={metrics.bias > 0 ? `+${metrics.bias?.toLocaleString()}` : (metrics.bias?.toLocaleString() ?? '-')}
          unit="MW"
          subtitle={metrics.bias > 0 ? "Over-forecast (Shortfall Risk)" : "Under-forecast (Excess Wind)"}
          icon={TrendingUp}
          color={metrics.bias > 200 ? 'rose' : metrics.bias < -200 ? 'emerald' : 'cyan'}
          badge={metrics.bias > 200 ? 'SHORT' : metrics.bias < -200 ? 'LONG' : 'BALANCED'}
        />
        <MetricCard
          title="Accuracy (WAPE)"
          value={metrics.wape ?? '-'}
          unit="%"
          subtitle="Weighted Absolute % Error"
          icon={ShieldCheck}
          color="emerald"
        />
        <MetricCard
          title="Peak Forecast Miss"
          value={metrics.maxError?.toLocaleString() ?? '-'}
          unit="MW"
          subtitle="Maximum single-period deviation"
          icon={AlertTriangle}
          color="amber"
        />
      </div>

      {/* Primary Chart: Wind Generation vs Forecast */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Wind className="text-cyan-400" size={18} />
              Day-Ahead Wind Forecast vs Actual Delivery
            </h3>
            <p className="text-xs text-slate-400">
              National wind generation profile across 48 half-hour settlement periods (Cutoff: {gateClosureHour}:00 GMT on D-1)
            </p>
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg transition"
          >
            <Download size={14} /> Export Day Data
          </button>
        </div>
        <WindForecastChart periods={periods} />
      </div>

      {/* Secondary Chart: Thermal Procurement Residual */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Zap className="text-amber-400" size={18} />
            Thermal Procurement & Residual Market Buy Requirement
          </h3>
          <p className="text-xs text-slate-400">
            Net power volume to procure from Day-Ahead auction or dispatch thermal CCGTs after subtracting wind from consumer load
          </p>
        </div>
        <ResidualDemandChart periods={periods} demandMW={demandMW} />
      </div>

      {/* Half-Hour Settlement Period Data Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-white">Settlement Periods Ledger (48 Half-Hours)</h3>
            <p className="text-xs text-slate-400">Detailed period-by-period procurement and forecast delta breakdown</p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <Filter size={14} className="text-slate-400" />
            <span className="text-slate-400">Risk Filter:</span>
            {['ALL', 'DEFICIT', 'SURPLUS', 'BALANCED'].map(mode => (
              <button
                key={mode}
                onClick={() => setFilterRisk(mode)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                  filterRisk === mode
                    ? 'bg-cyan-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto max-h-96 overflow-y-auto border border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800 z-10">
              <tr>
                <th className="py-2.5 px-3">SP</th>
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3 text-right">Actual Wind</th>
                <th className="py-2.5 px-3 text-right">DA Forecast</th>
                <th className="py-2.5 px-3 text-right">Error (Δ MW)</th>
                <th className="py-2.5 px-3 text-right">Planned Buy</th>
                <th className="py-2.5 px-3 text-center">Imbalance Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredPeriods.map(p => (
                <tr key={p.settlementPeriod} className="hover:bg-slate-800/40">
                  <td className="py-2 px-3 font-semibold text-slate-400">{p.settlementPeriod}</td>
                  <td className="py-2 px-3 text-slate-200">{p.timeLabel}</td>
                  <td className="py-2 px-3 text-right font-medium text-emerald-400">{p.actualMW.toLocaleString()} MW</td>
                  <td className="py-2 px-3 text-right font-medium text-cyan-400">{p.forecastMW.toLocaleString()} MW</td>
                  <td className={`py-2 px-3 text-right font-semibold ${
                    p.errorMW < -250 ? 'text-rose-400' : p.errorMW > 250 ? 'text-emerald-400' : 'text-slate-400'
                  }`}>
                    {p.errorMW > 0 ? `+${p.errorMW}` : p.errorMW} MW
                  </td>
                  <td className="py-2 px-3 text-right text-amber-400">{p.plannedResidualMW.toLocaleString()} MW</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      p.imbalanceRisk === 'DEFICIT'
                        ? 'bg-rose-950/60 text-rose-400 border border-rose-800/50'
                        : p.imbalanceRisk === 'SURPLUS'
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {p.imbalanceRisk}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
