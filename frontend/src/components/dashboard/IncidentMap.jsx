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

export default function IncidentMap({ incidents = [], selectedIncident, onSelectIncident }) {
  const defaultCenter = [19.0760, 72.8777];
  const center = selectedIncident
    ? [selectedIncident.latitude, selectedIncident.longitude]
    : defaultCenter;

  return (
    <div className="w-full h-full min-h-[500px] rounded-2xl overflow-hidden border border-slate-800/80 relative shadow-2xl">
      <MapContainer center={defaultCenter} zoom={13} className="w-full h-full">
        {/* CartoDB Dark Matter High-Tech Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />
        <MapRecenter center={center} />

        {incidents.map((inc) => {
          const isEmergency = inc.severity >= 4;
          return (
            <React.Fragment key={inc.id}>
              {/* 200m Deduplication Radius Circle */}
              <Circle
                center={[inc.latitude, inc.longitude]}
                radius={200}
                pathOptions={{
                  color: isEmergency ? '#ef4444' : '#38bdf8',
                  fillColor: isEmergency ? '#ef4444' : '#38bdf8',
                  fillOpacity: 0.15,
                  weight: 1.5,
                  dashArray: '4, 4'
                }}
              />

              <Marker
                position={[inc.latitude, inc.longitude]}
                eventHandlers={{
                  click: () => onSelectIncident(inc),
                }}
              >
                <Popup className="custom-popup">
                  <div className="p-2 space-y-2 max-w-[240px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-sky-400 font-bold">{inc.tracking_id}</span>
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${
                        isEmergency ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-slate-800 text-slate-300'
                      }`}>
                        Severity {inc.severity}/5
                      </span>
                    </div>

                    <strong className="text-sm font-semibold capitalize block text-slate-100">{inc.category.replace('_', ' ')}</strong>
                    <p className="text-xs text-slate-400 line-clamp-2">{inc.description}</p>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px]">
                      <span className="text-sky-400 font-mono font-bold">Priority {inc.priority_score}</span>
                      <span className="uppercase text-emerald-400 font-semibold">{inc.status}</span>
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
