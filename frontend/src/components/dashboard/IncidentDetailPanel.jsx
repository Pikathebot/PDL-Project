import React, { useState } from 'react';
import { X, UserCheck, CheckCircle, AlertTriangle } from 'lucide-react';
import { updateIncidentStatus } from '../../services/api';

const STATUS_OPTIONS = [
  'reported',
  'ai_processing',
  'verified',
  'dispatched',
  'in_progress',
  'resolved',
  'closed',
];

export default function IncidentDetailPanel({ incident, onClose, onUpdate }) {
  const [updating, setUpdating] = useState(false);

  if (!incident) return null;

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      const updated = await updateIncidentStatus(incident.id, newStatus);
      onUpdate(updated);
    } catch (err) {
      alert('Failed to update incident status.');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl space-y-4 border border-slate-800">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <span className="text-xs text-cyan-400 font-mono font-bold">{incident.tracking_id}</span>
          <h3 className="text-lg font-bold text-slate-100 capitalize">{incident.category.replace('_', ' ')}</h3>
        </div>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-2 text-xs text-slate-300">
        <div>
          <span className="text-slate-500 block">Description</span>
          <p className="p-2.5 bg-slate-900/80 rounded-lg text-slate-200 mt-1">{incident.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="p-2 bg-slate-900/60 rounded-lg">
            <span className="text-slate-500 block">Severity Rating</span>
            <span className="font-bold text-sm text-cyan-400">{incident.severity} / 5</span>
          </div>
          <div className="p-2 bg-slate-900/60 rounded-lg">
            <span className="text-slate-500 block">Priority Score</span>
            <span className="font-bold text-sm text-cyan-400">{incident.priority_score}</span>
          </div>
        </div>

        {incident.structured_details && (
          <div className="pt-2">
            <span className="text-slate-500 block mb-1">AI Extracted Details</span>
            <pre className="p-2.5 bg-slate-950 rounded-lg text-[10px] text-cyan-300 overflow-x-auto">
              {JSON.stringify(incident.structured_details, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-slate-800 space-y-2">
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Update Incident Lifecycle Status</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {STATUS_OPTIONS.map((st) => (
            <button
              key={st}
              disabled={updating}
              onClick={() => handleStatusChange(st)}
              className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase transition border ${
                incident.status === st
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
