import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Shield, MapPin, AlertTriangle, BarChart3, Sun, Moon, Radio, Activity, Users, Layers, Maximize2, Layout } from 'lucide-react';

import CitizenReportForm from './components/citizen/CitizenReportForm';
import ReportStatusTracker from './components/citizen/ReportStatusTracker';
import IncidentMap from './components/dashboard/IncidentMap';
import IncidentQueue from './components/dashboard/IncidentQueue';
import IncidentDetailPanel from './components/dashboard/IncidentDetailPanel';
import { fetchIncidents } from './services/api';

function CitizenView() {
  const [tab, setTab] = useState('report');

  return (
    <div className="space-y-6">
      <div className="flex justify-center space-x-2 bg-[#111726]/80 p-1.5 rounded-xl border border-slate-800/80 max-w-xs mx-auto">
        <button
          onClick={() => setTab('report')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-wide transition ${
            tab === 'report' ? 'bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/20' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          REPORT HAZARD
        </button>
        <button
          onClick={() => setTab('track')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-wide transition ${
            tab === 'track' ? 'bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/20' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          TRACK STATUS
        </button>
      </div>

      {tab === 'report' ? <CitizenReportForm /> : <ReportStatusTracker />}
    </div>
  );
}

function DispatcherDashboardView() {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [fullMapMode, setFullMapMode] = useState(false);

  const loadData = async () => {
    try {
      const list = await fetchIncidents({});
      setIncidents(list);
      if (list.length > 0 && !selectedIncident) {
        setSelectedIncident(list[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdate = (updated) => {
    setIncidents((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    setSelectedIncident(updated);
  };

  const emergencyCount = incidents.filter((i) => i.severity >= 4).length;

  return (
    <div className="space-y-4">
      {/* Tactical Telemetry Metrics Header Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-panel p-3.5 rounded-xl flex items-center justify-between border-l-4 border-l-sky-500">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-mono block">ACTIVE HAZARDS</span>
            <span className="text-xl font-extrabold text-slate-100 font-mono">{incidents.length}</span>
          </div>
          <Activity className="w-5 h-5 text-sky-400 opacity-80" />
        </div>

        <div className="glass-panel p-3.5 rounded-xl flex items-center justify-between border-l-4 border-l-red-500">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-mono block">CRITICAL EMERGENCIES</span>
            <span className="text-xl font-extrabold text-red-400 font-mono">{emergencyCount}</span>
          </div>
          <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
        </div>

        <div className="glass-panel p-3.5 rounded-xl flex items-center justify-between border-l-4 border-l-emerald-500">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-mono block">ONLINE RESPONDERS</span>
            <span className="text-xl font-extrabold text-emerald-400 font-mono">14 UNITS</span>
          </div>
          <Users className="w-5 h-5 text-emerald-400 opacity-80" />
        </div>

        <div className="glass-panel p-3.5 rounded-xl flex items-center justify-between border-l-4 border-l-amber-500">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-mono block">AVG SLA RESOLUTION</span>
            <span className="text-xl font-extrabold text-amber-400 font-mono">18.4 MIN</span>
          </div>
          <Layers className="w-5 h-5 text-amber-400 opacity-80" />
        </div>
      </div>

      {/* Main Command Center Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[550px]">
        <div className={`${fullMapMode ? 'lg:col-span-3' : 'lg:col-span-2'} flex flex-col space-y-4`}>
          <div className="glass-panel p-4 rounded-2xl flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-sky-400" />
                <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider">Geospatial Tactical Map</h2>
              </div>
              
              <div className="flex items-center space-x-3">
                <span className="flex items-center text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-500/30">
                  <Radio className="w-3 h-3 mr-1 animate-pulse" /> LIVE TELEMETRY
                </span>
                <button
                  onClick={() => setFullMapMode(!fullMapMode)}
                  className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-sky-400 transition"
                  title="Toggle Full Map Mode"
                >
                  {fullMapMode ? <Layout className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <IncidentMap
              incidents={incidents}
              selectedIncident={selectedIncident}
              onSelectIncident={setSelectedIncident}
            />
          </div>

          {selectedIncident && (
            <IncidentDetailPanel
              incident={selectedIncident}
              onClose={() => setSelectedIncident(null)}
              onUpdate={handleUpdate}
            />
          )}
        </div>

        {!fullMapMode && (
          <div className="glass-panel p-4 rounded-2xl space-y-3 flex flex-col">
            <h2 className="text-sm font-bold border-b border-slate-800 pb-2.5 flex items-center justify-between uppercase tracking-wider">
              <span>Heap Priority Queue</span>
              <span className="text-[10px] px-2 py-0.5 bg-slate-900 rounded border border-slate-800 text-sky-400 font-mono">LIVE SORT</span>
            </h2>

            <IncidentQueue
              incidents={incidents}
              selectedIncident={selectedIncident}
              onSelectIncident={setSelectedIncident}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function AnalyticsView() {
  return (
    <div className="glass-panel p-10 rounded-2xl space-y-4 text-center max-w-xl mx-auto border border-sky-500/20">
      <BarChart3 className="w-14 h-14 text-sky-400 mx-auto" />
      <h2 className="text-2xl font-bold text-slate-100">Analytics & SLA Trends Engine</h2>
      <p className="text-slate-400 text-sm leading-relaxed">
        Spatial density heatmaps, SLA trend graphs, peak hours distribution, and responder workload analysis.
      </p>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState('dark');
  const location = useLocation();

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0e17]">
      {/* Tactical Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-4 lg:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="p-2 bg-gradient-to-tr from-sky-500 to-blue-600 rounded-xl text-slate-950 shadow-lg shadow-sky-500/20 group-hover:scale-105 transition font-extrabold">
              <Shield className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-wider text-slate-100 uppercase">SENTINEL</span>
              <span className="text-[9px] block text-sky-400 font-mono tracking-widest uppercase">TACTICAL COMMAND & DISPATCH</span>
            </div>
          </Link>

          <nav className="flex items-center space-x-1 sm:space-x-2 bg-[#111726] p-1 rounded-xl border border-slate-800">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition ${
                location.pathname === '/' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Citizen App
            </Link>
            <Link
              to="/dashboard"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition ${
                location.pathname === '/dashboard' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dispatcher Hub
            </Link>
            <Link
              to="/analytics"
              className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition ${
                location.pathname === '/analytics' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Analytics
            </Link>
          </nav>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-[#111726] border border-slate-800 text-slate-400 hover:text-sky-400 transition"
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Command Center Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Routes>
          <Route path="/" element={<CitizenView />} />
          <Route path="/dashboard" element={<DispatcherDashboardView />} />
          <Route path="/analytics" element={<AnalyticsView />} />
        </Routes>
      </main>
    </div>
  );
}
