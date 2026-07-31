import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Shield, MapPin, AlertTriangle, BarChart3, Sun, Moon, Radio, Search } from 'lucide-react';

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
      <div className="flex justify-center space-x-2 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800 max-w-xs mx-auto">
        <button
          onClick={() => setTab('report')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
            tab === 'report' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Report Hazard
        </button>
        <button
          onClick={() => setTab('track')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
            tab === 'track' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Track Status
        </button>
      </div>

      {tab === 'report' ? <CitizenReportForm /> : <ReportStatusTracker />}
    </div>
  );
}

function DispatcherDashboardView() {
  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const list = await fetchIncidents({});
      setIncidents(list);
      if (list.length > 0 && !selectedIncident) {
        setSelectedIncident(list[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Polling every 10s for baremetal prototype
    return () => clearInterval(interval);
  }, []);

  const handleUpdate = (updated) => {
    setIncidents((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    setSelectedIncident(updated);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="glass-panel p-4 sm:p-6 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-cyan-400" />
              <span>Live Geospatial Map</span>
            </h2>
            <span className="flex items-center text-xs text-emerald-400 bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-500/30">
              <Radio className="w-3 h-3 mr-1 animate-pulse" /> Active Monitoring
            </span>
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

      <div className="glass-panel p-4 sm:p-6 rounded-2xl space-y-4">
        <h2 className="text-lg font-semibold border-b border-slate-800 pb-3 flex items-center justify-between">
          <span>Priority Triage Queue</span>
          <span className="text-[10px] px-2 py-0.5 bg-slate-800 rounded-md text-slate-400 font-mono">Heap Ranked</span>
        </h2>

        <IncidentQueue
          incidents={incidents}
          selectedIncident={selectedIncident}
          onSelectIncident={setSelectedIncident}
        />
      </div>
    </div>
  );
}

function AnalyticsView() {
  return (
    <div className="glass-panel p-8 rounded-2xl space-y-4 text-center max-w-xl mx-auto">
      <BarChart3 className="w-12 h-12 text-cyan-400 mx-auto" />
      <h2 className="text-xl font-bold text-slate-100">Analytics & SLA Trends Engine</h2>
      <p className="text-slate-400 text-sm">
        Geographic hotspot heatmaps, peak incident frequency, and response workload distribution will render here.
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
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="p-2 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl text-white shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-wider text-slate-100 uppercase">Sentinel</span>
              <span className="text-[10px] block text-cyan-400 font-mono tracking-widest uppercase">Public Safety AI</span>
            </div>
          </Link>

          <nav className="flex items-center space-x-1 sm:space-x-4 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                location.pathname === '/' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Report Hazard
            </Link>
            <Link
              to="/dashboard"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                location.pathname === '/dashboard' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dispatcher Hub
            </Link>
            <Link
              to="/analytics"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                location.pathname === '/analytics' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Analytics
            </Link>
          </nav>

          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 transition"
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

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
