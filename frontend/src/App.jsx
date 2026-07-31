import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Shield, MapPin, AlertTriangle, BarChart3, Sun, Moon, Radio } from 'lucide-react';

function CitizenReportView() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="glass-panel p-6 rounded-2xl border border-cyan-500/20 shadow-xl shadow-cyan-950/30">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">Report an Incident</h2>
            <p className="text-sm text-slate-400">Provide photos, audio, or description. AI handles instant verification & triage.</p>
          </div>
        </div>
        <div className="p-8 border-2 border-dashed border-slate-700 rounded-xl text-center hover:border-cyan-500/50 transition cursor-pointer bg-slate-900/50">
          <p className="text-slate-300 font-medium">Tap to capture or upload photo / video</p>
          <p className="text-xs text-slate-500 mt-1">Automatic EXIF & AI-gen verification will execute on submit</p>
        </div>
      </div>
    </div>
  );
}

function DispatcherDashboardView() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 glass-panel p-6 rounded-2xl min-h-[400px] flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-cyan-400" />
            <span>Live Geospatial Map</span>
          </h2>
          <span className="flex items-center text-xs text-emerald-400 bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-500/30">
            <Radio className="w-3 h-3 mr-1 animate-pulse" /> Live Feed
          </span>
        </div>
        <div className="bg-slate-900/80 rounded-xl h-72 flex items-center justify-center border border-slate-800 text-slate-500">
          Leaflet Interactive Map Loading...
        </div>
      </div>

      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <h2 className="text-lg font-semibold border-b border-slate-800 pb-3 flex items-center justify-between">
          <span>Priority Triage Queue</span>
          <span className="text-xs px-2 py-0.5 bg-slate-800 rounded-md text-slate-400">Heap Ordered</span>
        </h2>
        <div className="text-sm text-slate-400 italic">No incoming emergency incidents reported yet.</div>
      </div>
    </div>
  );
}

function AnalyticsView() {
  return (
    <div className="glass-panel p-6 rounded-2xl space-y-4">
      <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
        <BarChart3 className="w-6 h-6 text-cyan-400" />
        <span>Incident Analytics & SLA Trends</span>
      </h2>
      <p className="text-slate-400 text-sm">Response efficiency, geographic cluster heatmaps, and priority logs.</p>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState('dark');
  const location = useLocation();

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation Shell */}
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
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                location.pathname === '/' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Report Hazard
            </Link>
            <Link
              to="/dashboard"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                location.pathname === '/dashboard' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dispatcher Hub
            </Link>
            <Link
              to="/analytics"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
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

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Routes>
          <Route path="/" element={<CitizenReportView />} />
          <Route path="/dashboard" element={<DispatcherDashboardView />} />
          <Route path="/analytics" element={<AnalyticsView />} />
        </Routes>
      </main>
    </div>
  );
}
