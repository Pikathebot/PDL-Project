import React, { useState } from 'react';
import { Search, Filter, ShieldAlert, ArrowUpDown } from 'lucide-react';

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
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter queue by ID, hazard, location..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl theme-input font-medium"
          />
        </div>

        <div className="flex items-center space-x-1 overflow-x-auto pb-1 no-scrollbar">
          {['all', 'road_accident', 'fire', 'flooding', 'electrical_hazard', 'medical_emergency'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition border ${
                filterCategory === cat
                  ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold shadow'
                  : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              {cat === 'all' ? 'All Queue' : cat.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Incident List Cards */}
      <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
        {filteredIncidents.length === 0 ? (
          <div className="p-8 text-center bg-[var(--bg-input)] rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] text-xs">
            No incidents matching queue filters.
          </div>
        ) : (
          filteredIncidents.map((inc) => {
            const isSelected = selectedIncident?.id === inc.id;
            const isEmergency = inc.severity >= 4;

            return (
              <div
                key={inc.id}
                onClick={() => onSelectIncident(inc)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-sky-500/10 border-sky-500/60 shadow-md ring-1 ring-sky-500/30'
                    : 'theme-card'
                } ${isEmergency ? 'border-l-4 border-l-red-500' : ''}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-mono text-sky-500 font-bold tracking-wider">{inc.tracking_id}</span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md ${
                      isEmergency
                        ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Score {inc.priority_score}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-[var(--text-primary)] capitalize line-clamp-1">
                  {inc.category.replace('_', ' ')}
                </h4>
                <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 mt-0.5">{inc.description}</p>

                <div className="mt-2.5 pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px] text-[var(--text-muted)] font-medium">
                  <span>{inc.location_name || 'Coordinates set'}</span>
                  <span className="uppercase text-emerald-500 font-bold">{inc.status}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
