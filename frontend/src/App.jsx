import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Shield, MapPin, AlertTriangle, BarChart3, Sun, Moon, Radio, Activity, Users, Layers, Maximize2, Layout, SlidersHorizontal } from 'lucide-react';

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
      <div className="flex justify-center space-x-2 bg-[var(--bg-card)] p-1.5 rounded-2xl border border-[var(--border-subtle)] max-w-xs mx-auto shadow-md">
        <button
          onClick={() => setTab('report')}
          className={`px-5 py-2 rounded-xl text-xs font-extrabold tracking-wider transition ${
            tab === 'report' ? 'bg-sky-500 text-slate-950 shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          REPORT HAZARD
        </button>
        <button
          onClick={() => setTab('track')}
          className={`px-5 py-2 rounded-xl text-xs font-extrabold tracking-wider transition ${
            tab === 'track' ? 'bg-sky-500 text-slate-950 shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          TRACK STATUS
        </button>
      </div>

      {tab === 'report' ? <CitizenReportForm /> : <ReportStatusTracker />}
    </div>
  );
}

function DispatcherDashboardView({ theme }) {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [fullMapMode, setFullMapMode] = useState(false);
  const [showRadius, setShowRadius] = useState(true);

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
        <div className="theme-panel p-3.5 rounded-2xl flex items-center justify-between border-l-4 border-l-sky-500">
          <div>
            <span className="text-[10px] text-[var(--text-muted)] uppercase font-mono font-bold block">ACTIVE QUEUE</span>
            <span className="text-xl font-extrabold text-[var(--text-primary)] font-mono">{incidents.length}</span>
          </div>
          <Activity className="w-5 h-5 text-sky-500" />
        </div>

        <div className="theme-panel p-3.5 rounded-2xl flex items-center justify-between border-l-4 border-l-red-500">
          <div>
            <span className="text-[10px] text-[var(--text-muted)] uppercase font-mono font-bold block">EMERGENCIES</span>
            <span className="text-xl font-extrabold text-red-500 font-mono">{emergencyCount}</span>
          </div>
          <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
        </div>

        <div className="theme-panel p-3.5 rounded-2xl flex items-center justify-between border-l-4 border-l-emerald-500">
          <div>
            <span className="text-[10px] text-[var(--text-muted)] uppercase font-mono font-bold block">UNITS ONLINE</span>
            <span className="text-xl font-extrabold text-emerald-500 font-mono">14 UNITS</span>
          </div>
          <Users className="w-5 h-5 text-emerald-500" />
        </div>

        <div className="theme-panel p-3.5 rounded-2xl flex items-center justify-between border-l-4 border-l-amber-500">
          <div>
            <span className="text-[10px] text-[var(--text-muted)] uppercase font-mono font-bold block">AVG SLA TIME</span>
            <span className="text-xl font-extrabold text-amber-500 font-mono">18.4 MIN</span>
          </div>
          <Layers className="w-5 h-5 text-amber-500" />
        </div>
      </div>

      {/* Main Command Center Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[550px]">
        <div className={`${fullMapMode ? 'lg:col-span-3' : 'lg:col-span-2'} flex flex-col space-y-4`}>
          <div className="theme-panel p-4 rounded-3xl flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-sky-500" />
                <h2 className="text-sm font-extrabold text-[var(--text-primary)] uppercase tracking-wider">Geospatial Tactical Map</h2>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowRadius(!showRadius)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition ${
                    showRadius ? 'bg-sky-500/20 text-sky-500 border-sky-500/40' : 'bg-[var(--bg-input)] text-[var(--text-muted)] border-[var(--border-subtle)]'
                  }`}
                >
                  200m Cluster Radius
                </button>
                <button
                  onClick={() => setFullMapMode(!fullMapMode)}
                  className="p-1.5 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-lg text-[var(--text-secondary)] hover:text-sky-500 transition"
                  title="Toggle Full Map View"
                >
                  {fullMapMode ? <Layout className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <IncidentMap
              incidents={incidents}
              selectedIncident={selectedIncident}
              onSelectIncident={setSelectedIncident}
              theme={theme}
              showRadius={showRadius}
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
          <div className="theme-panel p-4 rounded-3xl space-y-3 flex flex-col">
            <h2 className="text-xs font-bold border-b border-[var(--border-subtle)] pb-2.5 flex items-center justify-between uppercase tracking-wider text-[var(--text-primary)]">
              <span>Priority Triage Queue</span>
              <span className="text-[10px] px-2 py-0.5 bg-[var(--bg-input)] rounded border border-[var(--border-subtle)] text-sky-500 font-mono font-bold">HEAP SORTED</span>
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
    <div className="theme-panel p-10 rounded-3xl space-y-4 text-center max-w-xl mx-auto border border-sky-500/20 shadow-2xl">
      <BarChart3 className="w-14 h-14 text-sky-500 mx-auto" />
      <h2 className="text-2xl font-extrabold text-[var(--text-primary)]">Analytics & SLA Trends Engine</h2>
      <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
        Geographic hotspot clustering heatmaps, SLA trend charts, peak incident hours distribution, and responder workload analysis.
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
    <div className="min-h-screen flex flex-col">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 theme-panel border-b border-[var(--border-subtle)] px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="p-2 bg-gradient-to-tr from-sky-500 to-blue-600 rounded-2xl text-slate-950 shadow-lg shadow-sky-500/25 group-hover:scale-105 transition font-extrabold">
              <Shield className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-wider text-[var(--text-primary)] uppercase">SENTINEL</span>
              <span className="text-[9px] block text-sky-500 font-mono tracking-widest uppercase font-bold">PUBLIC SAFETY COMMAND</span>
            </div>
          </Link>

          <nav className="flex items-center space-x-1 sm:space-x-2 bg-[var(--bg-input)] p-1.5 rounded-2xl border border-[var(--border-subtle)] shadow-inner">
            <Link
              to="/"
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold tracking-wider uppercase transition ${
                location.pathname === '/' ? 'bg-sky-500 text-slate-950 shadow-md font-extrabold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Citizen Portal
            </Link>
            <Link
              to="/dashboard"
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold tracking-wider uppercase transition ${
                location.pathname === '/dashboard' ? 'bg-sky-500 text-slate-950 shadow-md font-extrabold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Dispatcher Hub
            </Link>
            <Link
              to="/analytics"
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold tracking-wider uppercase transition ${
                location.pathname === '/analytics' ? 'bg-sky-500 text-slate-950 shadow-md font-extrabold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Analytics
            </Link>
          </nav>

          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-sky-500 transition shadow"
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-sky-600" />}
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Routes>
          <Route path="/" element={<CitizenView />} />
          <Route path="/dashboard" element={<DispatcherDashboardView theme={theme} />} />
          <Route path="/analytics" element={<AnalyticsView />} />
        </Routes>
      </main>
    </div>
  );
}
