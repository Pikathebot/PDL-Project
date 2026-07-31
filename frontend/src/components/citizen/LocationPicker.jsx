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
        alert('Could not detect location automatically. Please enter location manually.');
        setLoading(false);
      }
    );
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center">
          <MapPin className="w-3.5 h-3.5 mr-1 text-sky-500" /> Geolocation Pin
        </label>
        <button
          type="button"
          onClick={detectLocation}
          className="text-xs text-sky-500 font-bold hover:underline flex items-center space-x-1"
        >
          <Navigation className="w-3 h-3" />
          <span>{loading ? 'Locking GPS...' : 'Auto-detect Location'}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-[10px] text-[var(--text-muted)] font-mono block mb-1">LATITUDE</span>
          <input
            type="number"
            step="0.0001"
            value={coords.lat}
            onChange={(e) => setCoords(c => ({ ...c, lat: parseFloat(e.target.value) || 0 }))}
            className="w-full theme-input rounded-xl px-3 py-1.5 text-xs font-mono"
          />
        </div>
        <div>
          <span className="text-[10px] text-[var(--text-muted)] font-mono block mb-1">LONGITUDE</span>
          <input
            type="number"
            step="0.0001"
            value={coords.lng}
            onChange={(e) => setCoords(c => ({ ...c, lng: parseFloat(e.target.value) || 0 }))}
            className="w-full theme-input rounded-xl px-3 py-1.5 text-xs font-mono"
          />
        </div>
      </div>

      <input
        type="text"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Street Address / Landmark"
        className="w-full theme-input rounded-xl px-3.5 py-2 text-xs font-medium"
      />
    </div>
  );
}
