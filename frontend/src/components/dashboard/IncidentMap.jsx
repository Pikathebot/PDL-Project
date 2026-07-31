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

  // Tile layer URL based on current theme
  const tileUrl = theme === 'light'
    ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

  return (
    <div className="w-full h-full min-h-[480px] rounded-2xl overflow-hidden border border-[var(--border-subtle)] relative shadow-2xl transition-all">
      <MapContainer center={defaultCenter} zoom={13} className="w-full h-full">
        <TileLayer
          key={theme} // Force re-render tile layer on theme toggle
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url={tileUrl}
          maxZoom={19}
        />
        <MapRecenter center={center} />

        {incidents.map((inc) => {
          const isEmergency = inc.severity >= 4;
          return (
            <React.Fragment key={inc.id}>
              {/* 200m Deduplication Radius Circle */}
              {showRadius && (
                <Circle
                  center={[inc.latitude, inc.longitude]}
                  radius={200}
                  pathOptions={{
                    color: isEmergency ? '#ef4444' : '#0284c7',
                    fillColor: isEmergency ? '#ef4444' : '#38bdf8',
                    fillOpacity: 0.15,
                    weight: 1.5,
                    dashArray: '4, 4'
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
                  <div className="p-2 space-y-2 max-w-[240px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-sky-500 font-bold">{inc.tracking_id}</span>
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${
                        isEmergency ? 'bg-red-500/20 text-red-500 border border-red-500/40' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        Severity {inc.severity}/5
                      </span>
                    </div>

                    <strong className="text-sm font-semibold capitalize block text-[var(--text-primary)]">{inc.category.replace('_', ' ')}</strong>
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{inc.description}</p>

                    <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-[10px]">
                      <span className="text-sky-500 font-mono font-bold">Priority {inc.priority_score}</span>
                      <span className="uppercase text-emerald-500 font-semibold">{inc.status}</span>
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
