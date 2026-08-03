import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

export default function IncidentMap({ incidents = [], selectedIncident, onSelectIncident, theme = 'dark', showRadius = true }) {
  const defaultCenter = [19.0760, 72.8777];
  const center = selectedIncident
    ? [selectedIncident.latitude, selectedIncident.longitude]
    : defaultCenter;

  const [activeLayers, setActiveLayers] = React.useState({ incidents: true, units: true, hazards: true });
  const [activeFilter, setActiveFilter] = React.useState('all');

  const tileUrl = theme === 'light'
    ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

  return (
    <div className="w-full h-full min-h-[480px] rounded-3xl overflow-hidden border border-[var(--border-subtle)] relative shadow-2xl transition-all group">
      {/* Map Floating Data Layers Control (Top-Left) */}
      <div className="absolute top-4 left-4 z-[1000] bg-slate-950/80 dark:bg-slate-900/80 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700/50 shadow-2xl text-xs space-y-2 max-w-[170px]">
        <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider border-b border-slate-700/50 pb-1.5 flex items-center justify-between">
          <span>Data Layers</span>
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
        </div>
        <div className="space-y-1.5 pt-1 text-[11px] font-semibold text-slate-200">
          <label className="flex items-center space-x-2 cursor-pointer hover:text-cyan-400 transition">
            <input
              type="checkbox"
              checked={activeLayers.incidents}
              onChange={(e) => setActiveLayers({ ...activeLayers, incidents: e.target.checked })}
              className="rounded bg-slate-800 border-slate-600 text-cyan-500 focus:ring-0"
            />
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff]"></span>
            <span>Incidents</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer hover:text-emerald-400 transition">
            <input
              type="checkbox"
              checked={activeLayers.units}
              onChange={(e) => setActiveLayers({ ...activeLayers, units: e.target.checked })}
              className="rounded bg-slate-800 border-slate-600 text-emerald-500 focus:ring-0"
            />
            <span className="w-2 h-2 rounded-sm border border-emerald-400 bg-emerald-500/30"></span>
            <span>Units</span>
          </label>
          <label className="flex items-center space-x-2 cursor-pointer hover:text-red-400 transition">
            <input
              type="checkbox"
              checked={activeLayers.hazards}
              onChange={(e) => setActiveLayers({ ...activeLayers, hazards: e.target.checked })}
              className="rounded bg-slate-800 border-slate-600 text-red-500 focus:ring-0"
            />
            <span className="text-red-400 text-xs">⚠️</span>
            <span>Hazards</span>
          </label>
        </div>
      </div>

      {/* Map Floating Quick Category Filters (Bottom-Left) */}
      <div className="absolute bottom-4 left-4 z-[1000] flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'All Markers', icon: '📍', color: 'bg-slate-900/80 border-slate-700 text-slate-200' },
          { id: 'fire', label: 'Active Fires', icon: '🔥', color: 'bg-red-950/80 border-red-500/40 text-red-400' },
          { id: 'medical', label: 'Medical', icon: '🚑', color: 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400' },
          { id: 'traffic', label: 'Traffic', icon: '🚗', color: 'bg-amber-950/80 border-amber-500/40 text-amber-400' }
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveFilter(item.id)}
            className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold backdrop-blur-md transition flex items-center space-x-1.5 shadow-lg ${
              activeFilter === item.id ? 'ring-2 ring-cyan-400 scale-105 ' + item.color : item.color + ' opacity-80 hover:opacity-100'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <MapContainer center={defaultCenter} zoom={13} className="w-full h-full">
        <TileLayer
          key={theme}
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url={tileUrl}
          maxZoom={19}
        />
        <MapRecenter center={center} />

        {activeLayers.incidents && incidents.map((inc) => {
          const isEmergency = inc.severity >= 4;
          if (activeFilter !== 'all' && !inc.category.toLowerCase().includes(activeFilter)) return null;

          return (
            <React.Fragment key={inc.id}>
              {showRadius && (
                <Circle
                  center={[inc.latitude, inc.longitude]}
                  radius={200}
                  pathOptions={{
                    color: isEmergency ? '#ff1744' : '#00f0ff',
                    fillColor: isEmergency ? '#ff1744' : '#00f0ff',
                    fillOpacity: 0.2,
                    weight: 2,
                    dashArray: '5, 5'
                  }}
                />
              )}

              <Marker
                position={[inc.latitude, inc.longitude]}
                eventHandlers={{
                  click: () => onSelectIncident(inc),
                }}
              >
                <Popup className="custom-popup">
                  <div className="p-2.5 space-y-2 max-w-[250px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-cyan-400 font-bold">{inc.tracking_id}</span>
                      <span className={`px-2 py-0.5 text-[9px] font-extrabold rounded-full uppercase ${
                        isEmergency ? 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-[0_0_10px_rgba(255,23,68,0.3)]' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                      }`}>
                        Severity {inc.severity}/5
                      </span>
                    </div>

                    <strong className="text-sm font-extrabold capitalize block text-[var(--text-primary)]">{inc.category.replace('_', ' ')}</strong>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-snug">{inc.description}</p>

                    <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px]">
                      <span className="text-cyan-400 font-mono font-bold">Priority Score {inc.priority_score}</span>
                      <span className="uppercase text-emerald-400 font-extrabold">{inc.status}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
