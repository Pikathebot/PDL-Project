import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet marker icons pathing in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function IncidentMap({ incidents = [], selectedIncident, onSelectIncident }) {
  const defaultCenter = [19.0760, 72.8777];
  const center = selectedIncident
    ? [selectedIncident.latitude, selectedIncident.longitude]
    : defaultCenter;

  return (
    <div className="w-full h-[450px] rounded-xl overflow-hidden border border-slate-800 relative">
      <MapContainer center={defaultCenter} zoom={12} className="w-full h-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapRecenter center={center} />
        {incidents.map((inc) => (
          <Marker
            key={inc.id}
            position={[inc.latitude, inc.longitude]}
            eventHandlers={{
              click: () => onSelectIncident(inc),
            }}
          >
            <Popup className="custom-popup">
              <div className="p-1 space-y-1">
                <span className="text-[10px] font-mono text-cyan-600 font-bold block">{inc.tracking_id}</span>
                <strong className="text-sm capitalize block">{inc.category.replace('_', ' ')}</strong>
                <p className="text-xs text-gray-600 line-clamp-2">{inc.description}</p>
                <div className="mt-1 flex items-center justify-between text-[10px]">
                  <span className="px-1.5 py-0.5 bg-cyan-100 text-cyan-800 font-semibold rounded">
                    Score: {inc.priority_score}
                  </span>
                  <span className="capitalize text-gray-500">{inc.status}</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
