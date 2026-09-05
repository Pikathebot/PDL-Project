import React, { useState } from 'react';
import { AlertTriangle, Send, Phone, CheckCircle, Flame, Car, HardHat, Waves, Wind, Zap, Activity, ShieldAlert } from 'lucide-react';
import CameraCapture from './CameraCapture';
import VoiceRecorder from './VoiceRecorder';
import LocationPicker from './LocationPicker';
import { submitIncidentReport } from '../../services/api';

const CATEGORIES = [
  { id: 'road_accident', label: 'Road Accident', icon: Car, color: 'text-amber-500 bg-amber-500/10 border-amber-500/30' },
  { id: 'fire', label: 'Fire Hazard', icon: Flame, color: 'text-red-500 bg-red-500/10 border-red-500/30' },
  { id: 'infrastructure_damage', label: 'Infrastructure', icon: HardHat, color: 'text-sky-500 bg-sky-500/10 border-sky-500/30' },
  { id: 'flooding', label: 'Flooding / Water', icon: Waves, color: 'text-blue-500 bg-blue-500/10 border-blue-500/30' },
  { id: 'environmental_hazard', label: 'Gas / Chemical', icon: Wind, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30' },
  { id: 'electrical_hazard', label: 'Electrical Hazard', icon: Zap, color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30' },
  { id: 'medical_emergency', label: 'Medical Emergency', icon: Activity, color: 'text-purple-500 bg-purple-500/10 border-purple-500/30' },
  { id: 'criminal_activity', label: 'Crime / Violence', icon: ShieldAlert, color: 'text-rose-500 bg-rose-500/10 border-rose-500/30' },
];

export default function CitizenReportForm() {
  const [category, setCategory] = useState('road_accident');
  const [description, setDescription] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  // No default coordinates: a report must carry a location the reporter actually
  // supplied, not a plausible-looking one the form invented for them.
  const [location, setLocation] = useState({ lat: null, lng: null, location_name: '' });
  const [mediaFile, setMediaFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description) {
      alert('Please describe the hazard.');
      return;
    }
    if (!Number.isFinite(location.lat) || !Number.isFinite(location.lng)) {
      alert('Please set the incident location — use "Use my location" or enter coordinates.');
      return;
    }
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('category', category);
      formData.append('description', description);
      formData.append('latitude', location.lat);
      formData.append('longitude', location.lng);
      if (location.location_name) formData.append('location_name', location.location_name);
      if (phoneNumber) formData.append('phone_number', phoneNumber);
      if (mediaFile) formData.append('files', mediaFile);
      if (audioFile) formData.append('files', audioFile);

      const res = await submitIncidentReport(formData);
      setResult(res);
    } catch (err) {
      alert('Error submitting report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="max-w-xl mx-auto theme-panel p-8 rounded-3xl text-center space-y-4 border border-emerald-500/30 shadow-2xl">
        <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto animate-bounce" />
        <h2 className="text-2xl font-extrabold text-[var(--text-primary)]">Report Transmitted</h2>
        <p className="text-[var(--text-secondary)] text-xs">Your report has been logged and queued for review.</p>
        <div className="p-4 bg-[var(--bg-input)] rounded-2xl border border-[var(--border-subtle)] font-mono text-sky-500 font-bold text-xl tracking-wider">
          Tracking ID: {result.tracking_id}
        </div>
        <button
          onClick={() => setResult(null)}
          className="mt-4 px-6 py-3 bg-sky-500 text-slate-950 font-bold rounded-xl hover:bg-sky-400 transition shadow"
        >
          Submit Another Report
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto theme-panel p-6 sm:p-8 rounded-3xl space-y-6 shadow-2xl">
      <div className="flex items-center space-x-3 border-b border-[var(--border-subtle)] pb-4">
        <div className="p-3 bg-sky-500/10 rounded-2xl text-sky-500">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-[var(--text-primary)] uppercase tracking-wider">Report Public Hazard</h2>
          <p className="text-xs text-[var(--text-secondary)]">Automated AI priority triage and authority dispatching</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Select Hazard Type</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`p-3 rounded-2xl text-left border transition flex flex-col justify-between space-y-2 ${
                  isSelected
                    ? `${cat.color} font-bold shadow-lg ring-2 ring-sky-500/40`
                    : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-bold leading-tight block">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Description of Hazard</label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what happened, injuries, or immediate risks..."
          className="w-full theme-input rounded-2xl p-3.5 text-sm font-medium focus:border-sky-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CameraCapture onFileSelected={setMediaFile} />
        <VoiceRecorder onAudioRecorded={setAudioFile} />
      </div>

      <LocationPicker onLocationChange={setLocation} />

      <div className="space-y-1">
        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center">
          <Phone className="w-3.5 h-3.5 mr-1 text-sky-500" /> Contact Phone (Optional)
        </label>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+91 98765 43210"
          className="w-full theme-input rounded-xl px-3.5 py-2.5 text-sm font-medium"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-4 bg-gradient-to-r from-sky-500 to-blue-600 text-slate-950 font-extrabold rounded-2xl shadow-lg shadow-sky-500/25 hover:opacity-95 transition flex items-center justify-center space-x-2 text-base tracking-wider uppercase"
      >
        <Send className="w-5 h-5" />
        <span>{submitting ? 'Transmitting to AI Pipeline...' : 'Submit Emergency Report'}</span>
      </button>
    </form>
  );
}
