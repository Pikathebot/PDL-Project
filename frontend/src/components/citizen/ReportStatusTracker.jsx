import React, { useState } from 'react';
import { Search, Clock, ShieldCheck, Truck, CheckCircle2 } from 'lucide-react';
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
    <div className="max-w-2xl mx-auto glass-panel p-6 sm:p-8 rounded-2xl space-y-6">
      <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
        <Clock className="w-6 h-6 text-cyan-400" />
        <span>Track Incident Status</span>
      </h2>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={trackingId}
          onChange={(e) => setTrackingId(e.target.value)}
          placeholder="Enter Tracking ID (e.g. INC-A1B2C3D4)"
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
        />
        <button
          type="submit"
          className="px-5 py-2.5 bg-cyan-500 text-slate-950 font-bold rounded-xl hover:bg-cyan-400 transition flex items-center space-x-1"
        >
          <Search className="w-4 h-4" />
          <span>Track</span>
        </button>
      </form>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {incident && (
        <div className="p-6 bg-slate-900/80 rounded-xl border border-slate-800 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs text-cyan-400 font-mono font-semibold">{incident.tracking_id}</span>
              <h3 className="text-lg font-bold text-slate-100 capitalize">{incident.category.replace('_', ' ')}</h3>
              <p className="text-xs text-slate-400">{incident.location_name || 'Coordinates captured'}</p>
            </div>
            <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold rounded-full uppercase">
              {incident.status}
            </span>
          </div>

          <div className="pt-4 border-t border-slate-800 grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
            {STATUS_STEPS.map((step, idx) => {
              const currentIdx = STATUS_STEPS.findIndex((s) => s.id === incident.status);
              const isDone = idx <= currentIdx;
              return (
                <div key={step.id} className="space-y-1">
                  <div
                    className={`w-6 h-6 rounded-full mx-auto flex items-center justify-center text-xs font-bold ${
                      isDone ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span className={`text-[10px] block ${isDone ? 'text-slate-200' : 'text-slate-500'}`}>
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
