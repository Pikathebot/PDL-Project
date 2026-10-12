import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  Shield, MapPin, BarChart3, Sun, Moon, Maximize2,
  Layout, Bell, LogOut, Lock
} from 'lucide-react';

import CitizenReportForm from './components/citizen/CitizenReportForm';
import ReportStatusTracker from './components/citizen/ReportStatusTracker';
import IncidentMap from './components/dashboard/IncidentMap';
import IncidentQueue from './components/dashboard/IncidentQueue';
import IncidentDetailPanel from './components/dashboard/IncidentDetailPanel';
import { fetchIncidents, fetchAnalyticsSummary } from './services/api';
import { wsService } from './services/websocket';
import { login, logout, getUser, subscribe as subscribeAuth } from './services/auth';

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
  const [loadError, setLoadError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [feed, setFeed] = useState({ status: 'disconnected', detail: null });
  const hasAutoSelected = useRef(false);

  const loadData = useCallback(async () => {
    try {
      const [list, summary] = await Promise.all([fetchIncidents({}), fetchAnalyticsSummary()]);
      setIncidents(list);
      setAnalytics(summary);
      // Only auto-open a panel on the dashboard's first load. Reusing this on
      // every refresh (15s poll, every WS event) reopened the panel right
      // after the dispatcher closed it, since a closed panel is `null` too.
      if (!hasAutoSelected.current) {
        hasAutoSelected.current = true;
        setSelectedIncident((prev) => prev ?? list[0] ?? null);
      }
      setLoadError(null);
    } catch (err) {
      console.error(err);
      // Surface the failure instead of leaving the last-known (or empty) data
      // on screen looking authoritative.
      setLoadError(err.message || 'Could not reach the backend.');
    }
  }, []);

  useEffect(() => {
    loadData();
    const RELOAD_EVENTS = ['incident_created', 'incident_status_updated', 'dispatch_assigned', 'incident_ai_processed'];
    const unsubscribe = wsService.subscribe((msg) => {
      if (RELOAD_EVENTS.includes(msg.event)) {
        loadData();
      }
    });
    const unsubscribeStatus = wsService.subscribeStatus(setFeed);
    // When AI runs in a Celery worker it cannot reach this socket, so the
    // REPORTED -> VERIFIED transition only arrives by polling.
    const poll = setInterval(loadData, 15000);
    return () => {
      unsubscribe();
      unsubscribeStatus();
      clearInterval(poll);
    };
  }, [loadData]);

  const handleUpdate = (updated) => {
    setIncidents((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    setSelectedIncident(updated);
  };

  const emergencyCount = incidents.filter((i) => i.severity >= 4).length;
  const majorCount = incidents.filter((i) => i.severity === 3).length;
  const minorCount = incidents.filter((i) => i.severity <= 2).length;
  const pct = (n) => (incidents.length ? `${Math.round((n / incidents.length) * 100)}%` : '0%');
  const responders = analytics?.responder_counts ?? null;
  const clusters = analytics?.clusters ?? null;

  return (
    <div className="space-y-6">
      {(loadError || feed.status === 'unauthorized' || feed.status === 'failed') && (
        <div className="p-4 rounded-2xl border border-red-500/40 bg-red-500/10 text-red-300 text-xs space-y-1">
          {loadError && (
            <p>
              <span className="font-extrabold uppercase tracking-wider">Backend unreachable.</span>{' '}
              {loadError} Figures below may be stale.
            </p>
          )}
          {(feed.status === 'unauthorized' || feed.status === 'failed') && (
            <p>
              <span className="font-extrabold uppercase tracking-wider">Live feed unavailable.</span>{' '}
              {feed.detail} Incidents will not update until the page is reloaded.
            </p>
          )}
        </div>
      )}

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
            <span className="text-4xl font-extrabold text-[var(--text-primary)] font-mono tracking-tight">{incidents.length}</span>
            <span className="text-xs text-[var(--text-muted)] font-bold font-mono">
              {incidents.length === 1 ? 'report' : 'reports'}
            </span>
          </div>
          {/* Breakdown progress bars */}
          <div className="space-y-1.5 text-[10px] font-bold font-mono">
            <div className="flex justify-between text-red-400">
              <span>{emergencyCount} CRITICAL</span>
              <div className="w-24 bg-slate-800 rounded-full h-1.5 my-auto overflow-hidden">
                <div className="bg-red-500 h-full rounded-full" style={{ width: pct(emergencyCount) }}></div>
              </div>
            </div>
            <div className="flex justify-between text-amber-400">
              <span>{majorCount} MAJOR</span>
              <div className="w-24 bg-slate-800 rounded-full h-1.5 my-auto overflow-hidden">
                <div className="bg-amber-400 h-full rounded-full" style={{ width: pct(majorCount) }}></div>
              </div>
            </div>
            <div className="flex justify-between text-emerald-400">
              <span>{minorCount} MINOR</span>
              <div className="w-24 bg-slate-800 rounded-full h-1.5 my-auto overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: pct(minorCount) }}></div>
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
            <span className="text-4xl font-extrabold text-[var(--text-primary)] font-mono tracking-tight">
              {analytics ? analytics.total_responders : '-'}
            </span>
            <span className="text-xs text-[var(--text-muted)] font-mono">TOTAL UNITS</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 pt-1 text-center">
            <div className="p-2 rounded-2xl bg-cyan-500/10 border border-cyan-500/30">
              <span className="text-base font-extrabold text-cyan-400 font-mono block">{responders ? responders.busy : '-'}</span>
              <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-tighter">DEPLOYED</span>
            </div>
            <div className="p-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
              <span className="text-base font-extrabold text-emerald-400 font-mono block">{responders ? responders.available : '-'}</span>
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-tighter">AVAILABLE</span>
            </div>
            <div className="p-2 rounded-2xl bg-red-500/10 border border-red-500/30">
              <span className="text-base font-extrabold text-red-400 font-mono block">{responders ? responders.offline : '-'}</span>
              <span className="text-[9px] font-bold text-red-400 uppercase tracking-tighter">OFFLINE</span>
            </div>
          </div>
        </div>

        {/* Card 3: Current Telemetry & Alerts */}
        <div className="theme-panel p-5 rounded-3xl relative overflow-hidden border border-amber-500/20 shadow-xl hover:border-amber-500/40 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Duplicate Clusters</span>
            <span className="px-2 py-0.5 text-[9px] font-extrabold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Union-Find
            </span>
          </div>
          <div className="flex items-baseline space-x-2 mb-3">
            <span className="text-4xl font-extrabold text-[var(--text-primary)] font-mono tracking-tight">
              {clusters ? clusters.count : '-'}
            </span>
            <span className="text-xs text-amber-400 font-bold font-mono">
              {clusters ? `${clusters.merged_reports} REPORTS MERGED` : ''}
            </span>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] leading-relaxed pt-1">
            Reports within 200 m and 2 h whose descriptions are semantically similar are
            merged into a single incident by the disjoint-set clustering pass.
          </p>
        </div>

        {/* Card 4: System Operational Status */}
        <div className="theme-panel p-5 rounded-3xl relative overflow-hidden border border-indigo-500/20 shadow-xl hover:border-indigo-500/40 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Connection Status</span>
          </div>
          <div className="mb-3">
            <span className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight block">
              {loadError ? 'Degraded' : 'Reachable'}
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">
              {loadError ? 'Backend API is not responding' : 'Backend API responding'}
            </span>
          </div>
          <div className="space-y-1.5 text-[10px] font-mono font-bold">
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)] uppercase">REST API</span>
              <span className={loadError ? 'text-red-400' : 'text-emerald-400'}>
                {loadError ? 'UNREACHABLE' : 'OK'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--text-muted)] uppercase">Live feed</span>
              <span className={feed.status === 'connected' ? 'text-emerald-400' : 'text-amber-400'}>
                {feed.status.toUpperCase()}
              </span>
            </div>
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

          {/* Distribution charts. Both are plotted from the analytics aggregates -
              they replace a static SVG path badged "Interactive" and a bar chart
              whose heights were the literal array [45,65,30,80,55,90,40,70,85]. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="theme-panel p-5 rounded-3xl space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
                <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Hazard Categories</h3>
                <span className="text-[10px] px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded-full border border-cyan-500/30 font-mono font-bold">
                  {analytics ? `${analytics.total_incidents} TOTAL` : '-'}
                </span>
              </div>
              {!analytics || analytics.total_incidents === 0 ? (
                <p className="h-32 flex items-center justify-center text-[11px] text-[var(--text-muted)] italic">
                  No incidents recorded yet.
                </p>
              ) : (
                <div className="space-y-1.5 pt-1">
                  {Object.entries(analytics.category_counts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, count]) => (
                      <div key={category} className="flex items-center space-x-2 text-[10px] font-mono font-bold">
                        <span className="w-32 shrink-0 text-[var(--text-secondary)] capitalize truncate">
                          {category.replace(/_/g, ' ')}
                        </span>
                        <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full"
                            style={{ width: `${Math.round((count / analytics.total_incidents) * 100)}%` }}
                          ></div>
                        </div>
                        <span className="w-6 text-right text-cyan-400">{count}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="theme-panel p-5 rounded-3xl space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
                <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Severity Mix</h3>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/30 font-mono font-bold">
                  LIVE COUNTS
                </span>
              </div>
              {!analytics || analytics.total_incidents === 0 ? (
                <p className="h-32 flex items-center justify-center text-[11px] text-[var(--text-muted)] italic">
                  No incidents recorded yet.
                </p>
              ) : (
                <div className="h-32 w-full flex items-end justify-around space-x-3 pt-2 px-2">
                  {[
                    ['critical', 'from-red-500 to-red-400', 'text-red-400'],
                    ['major', 'from-amber-500 to-amber-400', 'text-amber-400'],
                    ['minor', 'from-cyan-500 to-emerald-400', 'text-emerald-400'],
                  ].map(([band, gradient, textColor]) => {
                    const count = analytics.severity_counts[band] ?? 0;
                    const height = Math.round((count / analytics.total_incidents) * 100);
                    return (
                      <div key={band} className="flex-1 flex flex-col items-center h-full">
                        <div className="flex-1 w-full flex items-end">
                          <div
                            className={`w-full bg-gradient-to-t ${gradient} rounded-t-lg transition-all duration-500`}
                            style={{ height: `${height}%` }}
                          ></div>
                        </div>
                        <span className={`text-[10px] font-mono font-bold mt-1 ${textColor}`}>{count}</span>
                        <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase">{band}</span>
                      </div>
                    );
                  })}
                </div>
              )}
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
              <span
                title={feed.detail || undefined}
                className={`px-2.5 py-1 border text-[10px] font-mono font-bold rounded-full ${
                  feed.status === 'connected'
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                    : feed.status === 'connecting' || feed.status === 'reconnecting'
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}
              >
                {feed.status === 'connected'
                  ? 'LIVE'
                  : feed.status === 'connecting'
                    ? 'CONNECTING'
                    : feed.status === 'reconnecting'
                      ? 'RECONNECTING'
                      : 'OFFLINE'}
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
        <div className="fixed inset-x-0 top-24 bottom-6 z-[2000] max-w-4xl mx-auto px-4 flex flex-col justify-end pointer-events-none [&>*]:pointer-events-auto">
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

function LoginView() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const from = location.state?.from ?? '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-10">
      <form onSubmit={handleSubmit} className="theme-panel p-8 rounded-3xl space-y-5 border border-cyan-500/30 shadow-2xl">
        <div className="text-center space-y-2">
          <Lock className="w-10 h-10 text-cyan-400 mx-auto" />
          <h2 className="text-xl font-extrabold text-[var(--text-primary)] uppercase tracking-wider font-mono">Dispatcher Sign-in</h2>
          <p className="text-[11px] text-[var(--text-muted)]">
            The dispatch console and analytics are restricted to authorised operators.
          </p>
        </div>
        <label className="block space-y-1">
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Email</span>
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-cyan-500"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-cyan-500"
          />
        </label>
        {error && (
          <p role="alert" className="text-[11px] text-red-400 font-mono">{error}</p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-extrabold uppercase tracking-wider disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

// Redirects to /login, remembering where the operator was headed.
function RequireAuth({ user, children }) {
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

function ResponseTimeTile({ label, minutes, sample, accent }) {
  const text = accent === 'cyan' ? 'text-cyan-400' : 'text-emerald-400';
  const border = accent === 'cyan' ? 'border-cyan-500/20' : 'border-emerald-500/20';
  const formatted = minutes == null
    ? '-'
    : minutes >= 90
      ? `${(minutes / 60).toFixed(1)} h`
      : `${Math.round(minutes)} min`;
  return (
    <div className={`theme-panel p-5 rounded-2xl border ${border}`}>
      <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">{label}</span>
      <span className={`text-3xl font-extrabold ${text} font-mono block mt-1`}>{formatted}</span>
      <span className="text-[10px] text-[var(--text-muted)] font-mono">
        {sample === 0 ? 'no incidents have reached this state yet' : `n = ${sample} incident${sample === 1 ? '' : 's'}`}
      </span>
    </div>
  );
}

function AnalyticsView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsSummary()
      .then((res) => setData(res))
      .catch((err) => {
        console.error(err);
        setData(null);
      })
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
          Category and severity distribution, responder availability, and duplicate-cluster
          counts, all computed from the incident database.
        </p>
      </div>

      {!data ? (
        <div className="theme-panel p-8 rounded-3xl text-center text-xs text-red-400">
          Analytics unavailable. The backend did not respond.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="theme-panel p-5 rounded-2xl border border-cyan-500/20">
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Total Logged Reports</span>
              <span className="text-3xl font-extrabold text-[var(--text-primary)] font-mono block mt-1">{data.total_incidents}</span>
            </div>
            <div className="theme-panel p-5 rounded-2xl border border-amber-500/20">
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Open Incidents</span>
              <span className="text-3xl font-extrabold text-amber-400 font-mono block mt-1">{data.open_incidents}</span>
            </div>
            <div className="theme-panel p-5 rounded-2xl border border-emerald-500/20">
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Available Units</span>
              <span className="text-3xl font-extrabold text-emerald-400 font-mono block mt-1">
                {data.responder_counts.available}
                <span className="text-base text-[var(--text-muted)]"> / {data.total_responders}</span>
              </span>
            </div>
            <div className="theme-panel p-5 rounded-2xl border border-indigo-500/20">
              <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold">Duplicate Clusters</span>
              <span className="text-3xl font-extrabold text-indigo-400 font-mono block mt-1">
                {data.clusters.count}
                <span className="text-base text-[var(--text-muted)]"> / {data.clusters.merged_reports} merged</span>
              </span>
            </div>
          </div>

          {/* Response times: mean of (dispatched_at - created_at) and
              (resolved_at - created_at) over incidents that reached that state.
              The sample size is shown so n=1 is not read as a trend. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ResponseTimeTile
              label="Avg Time to Dispatch"
              minutes={data.response_time?.avg_dispatch_minutes}
              sample={data.response_time?.dispatch_sample ?? 0}
              accent="cyan"
            />
            <ResponseTimeTile
              label="Avg Time to Resolve"
              minutes={data.response_time?.avg_resolve_minutes}
              sample={data.response_time?.resolve_sample ?? 0}
              accent="emerald"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="theme-panel p-5 rounded-3xl space-y-2">
              <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider border-b border-[var(--border-subtle)] pb-2">
                Category Distribution
              </h3>
              {Object.keys(data.category_counts).length === 0 ? (
                <p className="text-[11px] text-[var(--text-muted)] italic py-4">No incidents recorded yet.</p>
              ) : (
                Object.entries(data.category_counts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, count]) => (
                    <div key={category} className="flex items-center space-x-2 text-[10px] font-mono font-bold">
                      <span className="w-36 shrink-0 text-[var(--text-secondary)] capitalize truncate">
                        {category.replace(/_/g, ' ')}
                      </span>
                      <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full"
                          style={{ width: `${Math.round((count / data.total_incidents) * 100)}%` }}
                        ></div>
                      </div>
                      <span className="w-6 text-right text-cyan-400">{count}</span>
                    </div>
                  ))
              )}
            </div>

            <div className="theme-panel p-5 rounded-3xl space-y-2">
              <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider border-b border-[var(--border-subtle)] pb-2">
                Incident Status
              </h3>
              {Object.keys(data.status_counts).length === 0 ? (
                <p className="text-[11px] text-[var(--text-muted)] italic py-4">No incidents recorded yet.</p>
              ) : (
                Object.entries(data.status_counts).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between text-[11px] font-mono font-bold py-0.5">
                    <span className="text-[var(--text-secondary)] capitalize">{status.replace(/_/g, ' ')}</span>
                    <span className="text-cyan-400">{count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
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

  // Dispatcher session. auth.js owns storage; this mirrors it into React so
  // the guard and header re-render on login, logout, and a 401 from the API.
  const [user, setUser] = useState(() => getUser());
  const navigate = useNavigate();
  useEffect(() => subscribeAuth((session) => setUser(session?.user ?? null)), []);
  const handleLogout = () => {
    logout();
    wsService.disconnect();
    navigate('/login');
  };

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
            </button>

            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-full bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-cyan-400 transition"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-cyan-600" />}
            </button>

            <div className="hidden sm:flex items-center pl-2 border-l border-[var(--border-subtle)] space-x-2">
              {user ? (
                <>
                  <div className="text-right leading-tight">
                    <span className="block text-[11px] font-bold text-[var(--text-primary)]">{user.name}</span>
                    <span className="block text-[9px] font-mono uppercase tracking-wider text-cyan-400">{user.role}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 rounded-full bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-red-400 transition"
                    aria-label="Sign out"
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  className="px-2.5 py-1 rounded-full bg-[var(--bg-input)] border border-[var(--border-subtle)] text-[var(--text-secondary)] text-[9px] font-mono font-extrabold uppercase tracking-wider hover:text-cyan-400"
                >
                  Dispatcher sign-in
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Routes>
          <Route path="/" element={<CitizenView />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginView />} />
          <Route
            path="/dashboard"
            element={<RequireAuth user={user}><DispatcherDashboardView theme={theme} /></RequireAuth>}
          />
          <Route
            path="/analytics"
            element={<RequireAuth user={user}><AnalyticsView /></RequireAuth>}
          />
        </Routes>
      </main>
    </div>
  );
}
