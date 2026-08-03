import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  Shield, MapPin, BarChart3, Sun, Moon, Maximize2,
  Layout, Search, Bell, TrendingUp, ChevronRight
} from 'lucide-react';

import CitizenReportForm from './components/citizen/CitizenReportForm';
import ReportStatusTracker from './components/citizen/ReportStatusTracker';
import IncidentMap from './components/dashboard/IncidentMap';
import IncidentQueue from './components/dashboard/IncidentQueue';
import IncidentDetailPanel from './components/dashboard/IncidentDetailPanel';
import { fetchIncidents, fetchAnalyticsSummary } from './services/api';
import { wsService } from './services/websocket';

function CitizenView() {
  const [tab, setTab] = useState('report');

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-center space-x-2 bg-[var(--bg-card)] p-1.5 rounded-full border border-[var(--border-subtle)] max-w-xs mx-auto shadow-xl">
        <button
          onClick={() => setTab('report')}
          className={`px-6 py-2 rounded-full text-xs font-extrabold tracking-wider transition ${
            tab === 'report' ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          REPORT HAZARD
        </button>
        <button
          onClick={() => setTab('track')}
          className={`px-6 py-2 rounded-full text-xs font-extrabold tracking-wider transition ${
            tab === 'track' ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
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

  const loadData = useCallback(async () => {
    try {
      const list = await fetchIncidents({});
      setIncidents(list);
      setSelectedIncident((prev) => prev ?? list[0] ?? null);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsubscribe = wsService.subscribe((msg) => {
      if (msg.event === 'incident_created' || msg.event === 'incident_status_updated' || msg.event === 'dispatch_assigned') {
        loadData();
      }
    });
    return () => unsubscribe();
  }, [loadData]);

  const handleUpdate = (updated) => {
    setIncidents((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    setSelectedIncident(updated);
  };

  const emergencyCount = incidents.filter((i) => i.severity >= 4).length;
  const majorCount = incidents.filter((i) => i.severity === 3).length;
  const minorCount = incidents.filter((i) => i.severity <= 2).length;

  return (
    <div className="space-y-6">
      {/* 4 KPI Telemetry Cards (Matching Mockup Header Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Incidents */}
        <div className="theme-panel p-5 rounded-3xl relative overflow-hidden border border-cyan-500/20 shadow-xl group hover:border-cyan-500/40 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Active Incidents</span>
            <span className="px-2 py-0.5 text-[9px] font-extrabold rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
              Critical
            </span>
          </div>
          <div className="flex items-baseline space-x-3 mb-3">
            <span className="text-4xl font-extrabold text-[var(--text-primary)] font-mono tracking-tight">{incidents.length || 21}</span>
            <span className="text-xs text-emerald-400 font-bold font-mono flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5 inline" /> +2 this hr
            </span>
          </div>
          {/* Breakdown progress bars */}
          <div className="space-y-1.5 text-[10px] font-bold font-mono">
            <div className="flex justify-between text-red-400">
              <span>{emergencyCount || 5} CRITICAL</span>
              <div className="w-24 bg-slate-800 rounded-full h-1.5 my-auto overflow-hidden">
                <div className="bg-red-500 h-full rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
            <div className="flex justify-between text-amber-400">
              <span>{majorCount || 8} MAJOR</span>
              <div className="w-24 bg-slate-800 rounded-full h-1.5 my-auto overflow-hidden">
                <div className="bg-amber-400 h-full rounded-full" style={{ width: '60%' }}></div>
              </div>
            </div>
            <div className="flex justify-between text-emerald-400">
              <span>{minorCount || 8} MINOR</span>
              <div className="w-24 bg-slate-800 rounded-full h-1.5 my-auto overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: '70%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Unit Status */}
        <div className="theme-panel p-5 rounded-3xl relative overflow-hidden border border-emerald-500/20 shadow-xl hover:border-emerald-500/40 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Unit Status</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          </div>
          <div className="flex items-baseline space-x-2 mb-3">
            <span className="text-4xl font-extrabold text-[var(--text-primary)] font-mono tracking-tight">45</span>
            <span className="text-xs text-[var(--text-muted)] font-mono">TOTAL UNITS</span>
          </div>
          {/* 3 Status badges matching mockup */}
          <div className="grid grid-cols-3 gap-1.5 pt-1 text-center">
            <div className="p-2 rounded-2xl bg-cyan-500/10 border border-cyan-500/30">
              <span className="text-base font-extrabold text-cyan-400 font-mono block">32</span>
              <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-tighter">DEPLOYED</span>
            </div>
            <div className="p-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-base font-extrabold text-emerald-400 font-mono block">9</span>
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-tighter">AVAILABLE</span>
            </div>
            <div className="p-2 rounded-2xl bg-red-500/10 border border-red-500/30">
              <span className="text-base font-extrabold text-red-400 font-mono block">4</span>
              <span className="text-[9px] font-bold text-red-400 uppercase tracking-tighter">OOS</span>
            </div>
          </div>
        </div>

        {/* Card 3: Current Telemetry & Alerts */}
        <div className="theme-panel p-5 rounded-3xl relative overflow-hidden border border-amber-500/20 shadow-xl hover:border-amber-500/40 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Current Alerts</span>
            <span className="px-2 py-0.5 text-[9px] font-extrabold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              High Triage
            </span>
          </div>
          <div className="flex items-baseline space-x-2 mb-3">
            <span className="text-4xl font-extrabold text-[var(--text-primary)] font-mono tracking-tight">21</span>
            <span className="text-xs text-amber-400 font-bold font-mono">5 PRIORITY</span>
          </div>
          <div className="space-y-2 pt-1">
            <button className="w-full py-2 px-3 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-bold flex items-center justify-between transition">
              <span>Active Feeds</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button className="w-full py-2 px-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold flex items-center justify-between transition">
              <span>Critical Incidents</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card 4: System Operational Status */}
        <div className="theme-panel p-5 rounded-3xl relative overflow-hidden border border-indigo-500/20 shadow-xl hover:border-indigo-500/40 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">System Status</span>
            <span className="px-2 py-0.5 text-[9px] font-extrabold rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              99.8% Uptime
            </span>
          </div>
          <div className="mb-2">
            <span className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight block">Operational</span>
            <span className="text-[11px] text-[var(--text-muted)]">AI Pipeline & Celery Workers Live</span>
          </div>
          {/* Waveform graphic */}
          <div className="h-10 w-full pt-1">
            <svg viewBox="0 0 100 25" className="w-full h-full text-indigo-400 stroke-current fill-none stroke-[2]">
              <path d="M0 15 Q 15 5, 30 15 T 60 10 T 90 18 T 100 12" />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Workspace Grid (Left: Map & Analytics, Right: Activity Feed & Queue) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[600px]">
        {/* Left Column (2/3 width) */}
        <div className={`${fullMapMode ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-6 flex flex-col`}>
          {/* Tactical Map Container */}
          <div className="theme-panel p-5 rounded-3xl flex-1 flex flex-col justify-between shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-[var(--text-primary)] uppercase tracking-wider">Interactive Tactical Map</h2>
                  <p className="text-[11px] text-[var(--text-muted)] font-mono">Live GPS feed + 200m Cluster Radius</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowRadius(!showRadius)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition ${
                    showRadius ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-[0_0_10px_rgba(0,240,255,0.2)]' : 'bg-[var(--bg-input)] text-[var(--text-muted)] border-[var(--border-subtle)]'
                  }`}
                >
                  200m Cluster Radius
                </button>
                <button
                  onClick={() => setFullMapMode(!fullMapMode)}
                  className="p-2 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl text-[var(--text-secondary)] hover:text-cyan-400 transition"
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

          {/* Analytics & SLA Trends Row (Matching bottom of mockup) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="theme-panel p-5 rounded-3xl space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
                <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Dispatch Trends</h3>
                <span className="text-[10px] px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded-full border border-cyan-500/30 font-mono font-bold">Interactive</span>
              </div>
              <div className="h-32 w-full pt-2">
                <svg viewBox="0 0 200 80" className="w-full h-full">
                  <defs>
                    <linearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#00f0ff" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0 60 Q 40 20, 80 45 T 140 25 T 200 50 L 200 80 L 0 80 Z" fill="url(#cyanGrad)" />
                  <path d="M0 60 Q 40 20, 80 45 T 140 25 T 200 50" fill="none" stroke="#00f0ff" strokeWidth="3" />
                  <circle cx="80" cy="45" r="4" fill="#00f0ff" className="animate-ping" />
                  <circle cx="80" cy="45" r="4" fill="#00f0ff" />
                </svg>
              </div>
            </div>

            <div className="theme-panel p-5 rounded-3xl space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
                <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Response Times</h3>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/30 font-mono font-bold">AVG 18.4m</span>
              </div>
              <div className="h-32 w-full flex items-end justify-between space-x-2 pt-2 px-2">
                {[45, 65, 30, 80, 55, 90, 40, 70, 85].map((h, i) => (
                  <div key={i} className="flex-1 bg-slate-800 rounded-t-lg overflow-hidden h-full flex items-end">
                    <div
                      className="w-full bg-gradient-to-t from-cyan-500 to-emerald-400 rounded-t-lg transition-all duration-500 hover:brightness-125"
                      style={{ height: `${h}%` }}
                    ></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (1/3 width) - Real-Time Activity Feed & Queue */}
        {!fullMapMode && (
          <div className="theme-panel p-5 rounded-3xl space-y-4 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h2 className="text-sm font-extrabold text-[var(--text-primary)] uppercase tracking-wider">Real-Time Activity Feed</h2>
                <p className="text-[10px] text-[var(--text-muted)] font-mono">Heap priority queue sorted</p>
              </div>
              <span className="px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono font-bold rounded-full">
                LIVE
              </span>
            </div>

            <IncidentQueue
              incidents={incidents}
              selectedIncident={selectedIncident}
              onSelectIncident={setSelectedIncident}
            />
          </div>
        )}
      </div>

      {/* Floating Selected Incident Triage Panel */}
      {selectedIncident && (
        <div className="fixed inset-x-0 bottom-6 z-[2000] max-w-4xl mx-auto px-4">
          <IncidentDetailPanel
            incident={selectedIncident}
            onClose={() => setSelectedIncident(null)}
            onUpdate={handleUpdate}
          />
        </div>
      )}
    </div>
  );
}

function AnalyticsView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsSummary()
      .then((res) => setData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-10 text-center text-xs text-[var(--text-muted)] italic">
        Loading analytics telemetry...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="theme-panel p-8 rounded-3xl space-y-3 text-center border border-cyan-500/30 shadow-2xl">
        <BarChart3 className="w-12 h-12 text-cyan-400 mx-auto" />
        <h2 className="text-2xl font-extrabold text-[var(--text-primary)]">Analytics & SLA Telemetry Engine</h2>
        <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-2xl mx-auto">
          Geographic hotspot density analysis, average response SLA tracking, and category hazard distributions.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="theme-panel p-5 rounded-2xl border border-cyan-500/20">
          <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Total Logged Reports</span>
          <span className="text-3xl font-extrabold text-[var(--text-primary)] font-mono block mt-1">{data?.total_incidents || 0}</span>
        </div>
        <div className="theme-panel p-5 rounded-2xl border border-emerald-500/20">
          <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Active Units</span>
          <span className="text-3xl font-extrabold text-emerald-400 font-mono block mt-1">{data?.active_units || 45}</span>
        </div>
        <div className="theme-panel p-5 rounded-2xl border border-amber-500/20">
          <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Deployed Units</span>
          <span className="text-3xl font-extrabold text-amber-400 font-mono block mt-1">{data?.deployed_units || 32}</span>
        </div>
        <div className="theme-panel p-5 rounded-2xl border border-indigo-500/20">
          <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Avg Response SLA</span>
          <span className="text-3xl font-extrabold text-indigo-400 font-mono block mt-1">{data?.avg_response_time_minutes || 18.4}m</span>
        </div>
      </div>
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
    <div className="min-h-screen flex flex-col bg-[var(--bg-app)]">
      {/* Floating Top Navigation Header (Matching Mockup Header) */}
      <header className="sticky top-0 z-50 px-4 py-3 bg-[var(--bg-card)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)] shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo Brand */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="p-2 bg-gradient-to-tr from-cyan-400 to-blue-600 rounded-2xl text-slate-950 shadow-lg shadow-cyan-500/30 group-hover:scale-105 transition font-extrabold">
              <Shield className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-wider text-[var(--text-primary)] uppercase font-mono">SENTINEL</span>
              <span className="text-[9px] block text-cyan-400 font-mono tracking-widest uppercase font-bold">OPS CENTER</span>
            </div>
          </Link>

          {/* Global Search Bar (Matching Mockup) */}
          <div className="hidden md:flex items-center relative max-w-sm w-full mx-4">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5" />
            <input
              type="text"
              placeholder="Global Search..."
              className="w-full pl-10 pr-4 py-2 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:border-cyan-400 transition"
            />
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1 sm:space-x-2 bg-[var(--bg-input)] p-1.5 rounded-full border border-[var(--border-subtle)]">
            <Link
              to="/"
              className={`px-4 py-1.5 rounded-full text-xs font-extrabold tracking-wider uppercase transition ${
                location.pathname === '/' ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Citizen Portal
            </Link>
            <Link
              to="/dashboard"
              className={`px-4 py-1.5 rounded-full text-xs font-extrabold tracking-wider uppercase transition ${
                location.pathname === '/dashboard' ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/analytics"
              className={`px-4 py-1.5 rounded-full text-xs font-extrabold tracking-wider uppercase transition ${
                location.pathname === '/analytics' ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Analytics
            </Link>
          </nav>

          {/* User Profile & Actions (Matching Mockup) */}
          <div className="flex items-center space-x-3">
            <button className="relative p-2.5 rounded-full bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-cyan-400 transition">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                5
              </span>
            </button>

            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-full bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-cyan-400 transition"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-cyan-600" />}
            </button>

            <div className="hidden sm:flex items-center space-x-2.5 pl-2 border-l border-[var(--border-subtle)]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 to-emerald-400 p-0.5 shadow-[0_0_10px_rgba(0,240,255,0.3)]">
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-cyan-400 font-bold text-xs">
                  AR
                </div>
              </div>
              <div className="text-left leading-tight hidden lg:block">
                <span className="text-xs font-extrabold text-[var(--text-primary)] block">Alex R.</span>
                <span className="text-[10px] text-[var(--text-muted)] block">Dispatch Chief</span>
              </div>
            </div>
          </div>
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
