import React, { useState } from 'react';
import { Search, Clock } from 'lucide-react';
import { fetchIncidents } from '../../services/api';

const STATUS_STEPS = [
  { id: 'reported', label: 'Reported' },
  { id: 'ai_processing', label: 'AI Processing' },
  { id: 'verified', label: 'Verified' },
  { id: 'dispatched', label: 'Dispatched' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'resolved', label: 'Resolved' },
];

export default function ReportStatusTracker() {
  const [trackingId, setTrackingId] = useState('');
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!trackingId) return;
    setLoading(true);
    setError('');
    try {
      const list = await fetchIncidents({});
      const found = list.find((i) => i.tracking_id.toLowerCase() === trackingId.trim().toLowerCase());
      if (found) {
        setIncident(found);
      } else {
        setError('No incident found matching that tracking ID.');
        setIncident(null);
      }
    } catch (err) {
      setError('Error searching tracking system.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto theme-panel p-6 sm:p-8 rounded-3xl space-y-6 shadow-2xl">
      <h2 className="text-xl font-extrabold text-[var(--text-primary)] flex items-center space-x-2">
        <Clock className="w-6 h-6 text-sky-500" />
        <span>Track Incident Status</span>
      </h2>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={trackingId}
          onChange={(e) => setTrackingId(e.target.value)}
          placeholder="Enter Tracking ID (e.g. INC-A1B2C3D4)"
          className="flex-1 theme-input rounded-2xl px-4 py-3 text-sm font-mono"
        />
        <button
          type="submit"
          className="px-6 py-3 bg-sky-500 text-slate-950 font-bold rounded-2xl hover:bg-sky-400 transition shadow flex items-center space-x-1 uppercase tracking-wider text-xs"
        >
          <Search className="w-4 h-4" />
          <span>Track</span>
        </button>
      </form>

      {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}

      {incident && (
        <div className="p-6 bg-[var(--bg-input)] rounded-2xl border border-[var(--border-subtle)] space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs text-sky-500 font-mono font-bold">{incident.tracking_id}</span>
              <h3 className="text-lg font-extrabold text-[var(--text-primary)] capitalize">{incident.category.replace('_', ' ')}</h3>
              <p className="text-xs text-[var(--text-secondary)]">{incident.location_name || 'Location coordinates pinned'}</p>
            </div>
            <span className="px-3 py-1 bg-sky-500/20 text-sky-500 border border-sky-500/30 text-xs font-extrabold rounded-full uppercase">
              {incident.status}
            </span>
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)] grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
            {STATUS_STEPS.map((step, idx) => {
              const currentIdx = STATUS_STEPS.findIndex((s) => s.id === incident.status);
              const isDone = idx <= currentIdx;
              return (
                <div key={step.id} className="space-y-1">
                  <div
                    className={`w-7 h-7 rounded-full mx-auto flex items-center justify-center text-xs font-extrabold ${
                      isDone ? 'bg-sky-500 text-slate-950 shadow' : 'bg-slate-300 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span className={`text-[10px] block font-bold ${isDone ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
