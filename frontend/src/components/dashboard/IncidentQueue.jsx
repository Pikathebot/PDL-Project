import React, { useState } from 'react';
import { Search, Clock } from 'lucide-react';
import { formatTime } from '../../utils/datetime';

export default function IncidentQueue({ incidents = [], selectedIncident, onSelectIncident }) {
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredIncidents = incidents.filter((inc) => {
    const matchesCategory = filterCategory === 'all' || inc.category === filterCategory;
    const matchesSearch =
      inc.tracking_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inc.location_name && inc.location_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-3 flex flex-col h-full">
      {/* Search & Category Filter Header */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by ID, hazard, location..."
            className="w-full pl-10 pr-3 py-2 text-xs rounded-2xl theme-input font-medium"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
          {['all', 'road_accident', 'fire', 'flooding', 'electrical_hazard', 'medical_emergency',
            'infrastructure_damage', 'environmental_hazard', 'criminal_activity'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap transition border ${
                filterCategory === cat
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-extrabold shadow-md'
                  : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              {cat === 'all' ? 'All Queue' : cat.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Real-Time Activity List (Matching Mockup) */}
      <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
        {filteredIncidents.length === 0 ? (
          <div className="p-8 text-center bg-[var(--bg-input)] rounded-3xl border border-[var(--border-subtle)] text-[var(--text-muted)] text-xs font-mono">
            No incidents matching queue filters.
          </div>
        ) : (
          filteredIncidents.map((inc) => {
            const isSelected = selectedIncident?.id === inc.id;
            const isEmergency = inc.severity >= 4;

            const reportedAt = formatTime(inc.created_at);

            return (
              <div
                key={inc.id}
                onClick={() => onSelectIncident(inc)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.2)] ring-1 ring-cyan-400/40'
                    : 'theme-card hover:border-cyan-500/40'
                } ${isEmergency ? 'border-l-4 border-l-red-500' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono text-[var(--text-muted)] flex items-center">
                      <Clock className="w-3 h-3 mr-1 text-cyan-400" /> {reportedAt ?? '--:--'}
                    </span>
                    <span className="text-[10px] font-mono text-cyan-400 font-bold">{inc.tracking_id}</span>
                  </div>

                  {/* Neon Status Chip (Matching Mockup: ACTIVE, STABLE, CRITICAL) */}
                  <span
                    className={`px-2.5 py-0.5 text-[9px] font-extrabold rounded-full uppercase tracking-wider ${
                      isEmergency
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-[0_0_8px_rgba(255,23,68,0.3)]'
                        : inc.status === 'resolved'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                    }`}
                  >
                    {isEmergency ? 'CRITICAL' : inc.status === 'resolved' ? 'STABLE' : 'ACTIVE'}
                  </span>
                </div>

                <h4 className="text-xs font-extrabold text-[var(--text-primary)] capitalize line-clamp-1">
                  {inc.category.replace('_', ' ')}
                </h4>
                <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 mt-1 leading-relaxed">
                  {inc.description}
                </p>

                <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px]">
                  <span className="text-[var(--text-muted)] truncate max-w-[140px]">
                    📍 {inc.location_name || 'Geospatial Lock'}
                  </span>
                  <span className="font-mono text-cyan-400 font-extrabold bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                    P{inc.priority_score}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
