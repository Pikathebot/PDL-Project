import React from 'react';
import { AlertCircle, ChevronRight, ShieldAlert } from 'lucide-react';

export default function IncidentQueue({ incidents = [], selectedIncident, onSelectIncident }) {
  if (incidents.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-900/50 rounded-xl border border-slate-800 text-slate-500 text-sm">
        No active incidents in triage queue.
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
      {incidents.map((inc) => {
        const isSelected = selectedIncident?.id === inc.id;
        const isEmergency = inc.severity >= 4;

        return (
          <div
            key={inc.id}
            onClick={() => onSelectIncident(inc)}
            className={`p-3.5 rounded-xl border cursor-pointer transition ${
              isSelected
                ? 'bg-cyan-500/10 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            } ${isEmergency ? 'border-l-4 border-l-red-500' : ''}`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono text-cyan-400 font-bold">{inc.tracking_id}</span>
              <span
                className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md ${
                  isEmergency ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-800 text-slate-300'
                }`}
              >
                Priority {inc.priority_score}
              </span>
            </div>

            <h4 className="text-sm font-semibold text-slate-100 capitalize line-clamp-1">
              {inc.category.replace('_', ' ')}
            </h4>
            <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{inc.description}</p>

            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
              <span>{inc.location_name || 'Geo pin attached'}</span>
              <span className="uppercase text-cyan-400 font-semibold">{inc.status}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
