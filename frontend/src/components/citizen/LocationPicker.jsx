import React, { useState, useEffect } from 'react';
import { MapPin, Navigation } from 'lucide-react';

export default function LocationPicker({ onLocationChange }) {
  const [coords, setCoords] = useState({ lat: 19.0760, lng: 72.8777 });
  const [address, setAddress] = useState('Bandra Kurla Complex, Mumbai');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    onLocationChange({ ...coords, location_name: address });
  }, [coords, address]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported by your browser');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(newCoords);
        setAddress(`GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
        setLoading(false);
      },
      (err) => {
        alert('Could not detect location automatically. Please enter address manually.');
        setLoading(false);
      }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Incident Location</label>
        <button
          type="button"
          onClick={detectLocation}
          className="text-xs text-cyan-400 hover:underline flex items-center space-x-1"
        >
          <Navigation className="w-3 h-3" />
          <span>{loading ? 'Detecting...' : 'Auto-detect GPS'}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-[10px] text-slate-400 block mb-1">Latitude</span>
          <input
            type="number"
            step="0.0001"
            value={coords.lat}
            onChange={(e) => setCoords(c => ({ ...c, lat: parseFloat(e.target.value) || 0 }))}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
          />
        </div>
        <div>
          <span className="text-[10px] text-slate-400 block mb-1">Longitude</span>
          <input
            type="number"
            step="0.0001"
            value={coords.lng}
            onChange={(e) => setCoords(c => ({ ...c, lng: parseFloat(e.target.value) || 0 }))}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200"
          />
        </div>
      </div>

      <input
        type="text"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Landmark / Street Address"
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
      />
    </div>
  );
}
