import React, { useState, useEffect } from 'react';
import { MapPin, Navigation } from 'lucide-react';

export default function LocationPicker({ onLocationChange }) {
  // Deliberately empty. These fields used to be pre-filled with a real Mumbai
  // coordinate and the address "Bandra Kurla Complex, Mumbai", and the effect
  // below pushed them to the parent on mount - so any reporter who never touched
  // this control filed an emergency at a specific street address they had never
  // entered, and it was persisted and shown to dispatchers as their input.
  const [coords, setCoords] = useState({ lat: '', lng: '' });
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const lat = parseFloat(coords.lat);
    const lng = parseFloat(coords.lng);
    onLocationChange({
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      location_name: address.trim(),
    });
  }, [coords, address, onLocationChange]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation not supported by your browser');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Only the coordinates are known. There is no reverse-geocoding service
        // here, so the address field stays the reporter's to fill in.
        setCoords({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) });
        setLoading(false);
      },
      () => {
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
          <span>{loading ? 'Locking GPS...' : 'Use my location'}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-[10px] text-[var(--text-muted)] font-mono block mb-1">LATITUDE</span>
          <input
            type="number"
            step="0.0001"
            value={coords.lat}
            placeholder="required"
            onChange={(e) => setCoords(c => ({ ...c, lat: e.target.value }))}
            className="w-full theme-input rounded-xl px-3 py-1.5 text-xs font-mono"
          />
        </div>
        <div>
          <span className="text-[10px] text-[var(--text-muted)] font-mono block mb-1">LONGITUDE</span>
          <input
            type="number"
            step="0.0001"
            value={coords.lng}
            placeholder="required"
            onChange={(e) => setCoords(c => ({ ...c, lng: e.target.value }))}
            className="w-full theme-input rounded-xl px-3 py-1.5 text-xs font-mono"
          />
        </div>
      </div>

      <input
        type="text"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Street address / landmark (optional)"
        className="w-full theme-input rounded-xl px-3.5 py-2 text-xs font-medium"
      />
    </div>
  );
}
