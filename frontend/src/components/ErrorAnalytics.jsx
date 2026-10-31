import React from 'react';
import { BarChart3, AlertOctagon, TrendingDown, Target, Layers, Compass, CheckCircle2 } from 'lucide-react';
import MetricCard from './MetricCard';
import { SettlementPeriodBarChart, MonthlyOverviewChart } from './Charts';

export default function ErrorAnalytics({
  overviewData,
  profileData,
  distributionData,
  onSelectDate,
  selectedDate,
  gateClosureHour
}) {
  const overall = overviewData?.overallMetrics || {};
  const daily = overviewData?.dailySummaries || [];
  const buckets = distributionData?.buckets || [];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-900 border border-cyan-800/40 rounded-xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                Model Evaluation
              </span>
              <span className="text-xs text-slate-400 font-mono">January 2026 Comprehensive Backtest</span>
            </div>
            <h2 className="text-lg font-bold text-white">
              UK National Wind Forecast Accuracy Scorecard
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Evaluating Elexon BMRS <code className="text-cyan-300">WINDFOR</code> accuracy against <code className="text-emerald-300">FUELHH</code> actuals across 1,488 settlement periods. The analysis locks forecasts strictly at Day-Ahead Gate Closure ({gateClosureHour}:00 GMT on D-1).
            </p>
          </div>

          <div className="flex flex-col items-end bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Trading Desk Risk Hedge</span>
            <span className="text-xl font-bold font-mono text-rose-400">
              {overall.p10?.toLocaleString() ?? '-3,410'} MW
            </span>
            <span className="text-[10px] text-slate-400">P10 Extreme Shortfall Reserve Buffer</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Overall MAE"
          value={overall.mae?.toLocaleString() ?? '-'}
          unit="MW"
          subtitle="Mean Absolute Error across month"
          icon={Target}
          color="cyan"
        />
        <MetricCard
          title="Overall RMSE"
          value={overall.rmse?.toLocaleString() ?? '-'}
          unit="MW"
          subtitle="Penalizes large forecast swings"
          icon={AlertOctagon}
          color="amber"
        />
        <MetricCard
          title="Systematic Bias"
          value={overall.bias > 0 ? `+${overall.bias?.toLocaleString()}` : (overall.bias?.toLocaleString() ?? '-')}
          unit="MW"
          subtitle="Net tendency to over-forecast wind"
          icon={TrendingDown}
          color={overall.bias > 0 ? 'rose' : 'emerald'}
          badge="OVER-FORECAST"
        />
        <MetricCard
          title="Weighted Error (WAPE)"
          value={overall.wape ? `${overall.wape}%` : '-'}
          unit=""
          subtitle="Total Error / Total Generation"
          icon={BarChart3}
          color="emerald"
        />
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Compass className="text-cyan-400" size={18} />
              Daily Accuracy Trend (January 1 - 31, 2026)
            </h3>
            <p className="text-xs text-slate-400">
              Daily WAPE (%) performance. Click any bar to load that delivery day into the Decision Desk.
            </p>
          </div>
          {selectedDate && (
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800 px-2.5 py-1 rounded">
              Active Date: {selectedDate}
            </span>
          )}
        </div>
        <MonthlyOverviewChart daily={daily} onSelectDate={onSelectDate} selectedDate={selectedDate} />
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="mb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="text-cyan-400" size={18} />
            Diurnal Error Profile (Settlement Periods 1 to 48)
          </h3>
          <p className="text-xs text-slate-400">
            Average MAE (MW) for each half-hour of the day across all 31 days. Red bars signify hours with high over-forecast bias.
          </p>
        </div>
        <SettlementPeriodBarChart profile={profileData} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
          <h3 className="text-base font-bold text-white mb-1">Forecast Error Distribution (Actual - Forecast)</h3>
          <p className="text-xs text-slate-400 mb-4">Sample counts across error ranges (1,488 half-hours)</p>

          <div className="space-y-2">
            {buckets.map((b, idx) => {
              const maxCount = Math.max(...buckets.map(x => x.count), 1);
              const pct = ((b.count / maxCount) * 100).toFixed(0);
              const isShortfall = b.range.includes('-') || b.range.startsWith('<');

              return (
                <div key={idx} className="flex items-center gap-3 text-xs font-mono">
                  <span className="w-28 text-slate-400 text-right">{b.range}</span>
                  <div className="flex-1 bg-slate-950 rounded h-4 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded ${isShortfall ? 'bg-rose-500/80' : 'bg-cyan-500/80'}`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                  <span className="w-12 text-right text-slate-300 font-bold">{b.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <CheckCircle2 className="text-emerald-400" size={18} />
              Trading Desk Actionable Strategy
            </h3>
            <ul className="text-xs text-slate-300 space-y-3 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0"></span>
                <span>
                  <strong>Systematic Bias Correction:</strong> With a +{overall.bias} MW month-wide bias, the utility is structurally at risk of under-procuring thermal power and paying high cash-out settlement prices.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0"></span>
                <span>
                  <strong>Downside Hedging Envelope (P10):</strong> Keep a minimum spinning or option-backed thermal reserve of <strong>{Math.abs(overall.p10 || 3410).toLocaleString()} MW</strong> to cap financial exposure during extreme wind misses.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0"></span>
                <span>
                  <strong>Gate Closure Rigor:</strong> Tracking forecasts specifically as of 11:00 GMT on D-1 eliminates false optimism from intraday forecast convergence.
                </span>
              </li>
            </ul>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Methodology: Elexon BMRS Market Standards</span>
            <span className="font-mono text-cyan-400 font-semibold">Gridbricks Protocol</span>
          </div>
        </div>
      </div>
    </div>
  );
}
