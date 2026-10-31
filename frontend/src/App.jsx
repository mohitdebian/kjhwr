import React, { useState, useEffect } from 'react';
import { Wind, BarChart2, Calendar, Clock, BookOpen, ExternalLink, RefreshCw } from 'lucide-react';
import DecisionDesk from './components/DecisionDesk';
import ErrorAnalytics from './components/ErrorAnalytics';

export default function App() {
  const [activeTab, setActiveTab] = useState('desk');
  const [selectedDate, setSelectedDate] = useState('2026-01-15');
  const [gateClosureHour, setGateClosureHour] = useState(11);
  const [demandMW, setDemandMW] = useState(32000);

  const [overviewData, setOverviewData] = useState(null);
  const [dayData, setDayData] = useState(null);
  const [profileData, setProfileData] = useState([]);
  const [distributionData, setDistributionData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAggregates = async () => {
      try {
        const [overviewRes, profileRes, distRes] = await Promise.all([
          fetch(`/api/overview?gate_closure=${gateClosureHour}`).then(r => r.json()),
          fetch(`/api/profile?gate_closure=${gateClosureHour}`).then(r => r.json()),
          fetch(`/api/distribution?gate_closure=${gateClosureHour}`).then(r => r.json())
        ]);
        setOverviewData(overviewRes);
        setProfileData(profileRes);
        setDistributionData(distRes);
      } catch (err) {
        console.error('Failed to load aggregate overview:', err);
      }
    };
    fetchAggregates();
  }, [gateClosureHour]);

  useEffect(() => {
    const fetchDay = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/day?date=${selectedDate}&gate_closure=${gateClosureHour}&demand=${demandMW}`);
        const data = await res.json();
        setDayData(data);
      } catch (err) {
        console.error('Failed to load day data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDay();
  }, [selectedDate, gateClosureHour, demandMW]);

  const availableDates = overviewData?.availableDates || ['2026-01-15'];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="sticky top-0 z-30 bg-slate-900/90 border-b border-slate-800 backdrop-blur px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Wind className="text-white" size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">Gridbricks</span>
                <span className="text-xs px-2 py-0.5 rounded font-mono font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800">
                  GB Wind Desk
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">UK Day-Ahead Electricity Procurement & Forecast Accuracy</p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('desk')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'desk'
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar size={14} />
              Day-Ahead Decision Desk
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'analytics'
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart2 size={14} />
              Error Analytics & Model Eval
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'guide'
                  ? 'bg-cyan-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen size={14} />
              Guide
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Elexon BMRS Jan 2026 Loaded (1,488 SPs)</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        {activeTab === 'desk' && (
          <DecisionDesk
            dayData={dayData}
            loading={loading}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            availableDates={availableDates}
            gateClosureHour={gateClosureHour}
            setGateClosureHour={setGateClosureHour}
            demandMW={demandMW}
            setDemandMW={setDemandMW}
          />
        )}

        {activeTab === 'analytics' && (
          <ErrorAnalytics
            overviewData={overviewData}
            profileData={profileData}
            distributionData={distributionData}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setActiveTab('desk');
            }}
            selectedDate={selectedDate}
            gateClosureHour={gateClosureHour}
          />
        )}

        {activeTab === 'guide' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">UK Day-Ahead Market Decision Framework</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                This platform is tailored for UK energy utility electricity procurement desks buying power in the day-ahead wholesale electricity market (EPEX SPOT / Nord Pool GB).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-950/60 rounded-lg border border-slate-800">
                <h3 className="text-sm font-bold text-cyan-400 mb-1">1. Day-Ahead Gate Closure Rigor</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Auction gate closure occurs at <strong>11:00 GMT on Day D-1</strong>. Decisions cannot use future forecasts published intraday. Our platform filters <code className="text-cyan-300">WINDFOR</code> by <code className="text-cyan-300">publishTime &le; D-1 11:00 GMT</code>, faithfully reconstructing the trader's exact point-in-time information baseline.
                </p>
              </div>

              <div className="p-4 bg-slate-950/60 rounded-lg border border-slate-800">
                <h3 className="text-sm font-bold text-amber-400 mb-1">2. Quantitative Risk Buffering</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Evaluating MAE, RMSE, systematic Bias, and P10/P90 distributions enables the procurement team to determine optimal spinning reserve buffers and avoid punitive cash-out prices in the Balancing Mechanism.
                </p>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4 flex items-center justify-between text-xs text-slate-400">
              <span>Data Sources: Elexon BMRS FUELHH (Actuals) & WINDFOR (Forecasts)</span>
              <a
                href="https://bmrs.elexon.co.uk/api-documentation"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-cyan-400 hover:underline"
              >
                Elexon API Documentation <ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}
      </main>
      <footer className="border-t border-slate-800/80 bg-slate-950 px-4 py-4 text-center text-xs text-slate-500 font-mono">
        Gridbricks Pilot Assessment • UK Day-Ahead Wind Forecast & Error Analytics Platform (January 2026)
      </footer>
    </div>
  );
}
