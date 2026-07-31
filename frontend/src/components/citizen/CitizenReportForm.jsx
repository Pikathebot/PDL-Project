import React, { useState } from 'react';
import { AlertTriangle, Send, Phone, CheckCircle } from 'lucide-react';
import CameraCapture from './CameraCapture';
import VoiceRecorder from './VoiceRecorder';
import LocationPicker from './LocationPicker';
import { submitIncidentReport } from '../../services/api';

const CATEGORIES = [
  { id: 'road_accident', label: 'Road Accident' },
  { id: 'fire', label: 'Fire Hazard' },
  { id: 'infrastructure_damage', label: 'Infrastructure Damage' },
  { id: 'flooding', label: 'Flooding / Waterlogging' },
  { id: 'environmental_hazard', label: 'Environmental / Gas Leak' },
  { id: 'electrical_hazard', label: 'Electrical Danger' },
  { id: 'medical_emergency', label: 'Medical Emergency' },
  { id: 'criminal_activity', label: 'Violence / Crime' },
];

export default function CitizenReportForm() {
  const [category, setCategory] = useState('road_accident');
  const [description, setDescription] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [location, setLocation] = useState({ lat: 19.0760, lng: 72.8777, location_name: '' });
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
      <div className="max-w-xl mx-auto glass-panel p-8 rounded-2xl text-center space-y-4 border border-emerald-500/30">
        <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto" />
        <h2 className="text-2xl font-bold text-slate-100">Report Submitted Successfully</h2>
        <p className="text-slate-400 text-sm">Our AI pipeline is processing your submission and triaging priority.</p>
        <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 font-mono text-cyan-400 font-bold text-lg">
          Tracking ID: {result.tracking_id}
        </div>
        <button
          onClick={() => setResult(null)}
          className="mt-4 px-6 py-2.5 bg-cyan-500 text-slate-950 font-semibold rounded-xl hover:bg-cyan-400 transition"
        >
          Submit Another Report
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto glass-panel p-6 sm:p-8 rounded-2xl space-y-6">
      <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
        <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-100">Report Public Hazard</h2>
          <p className="text-xs text-slate-400">Automated AI severity analysis and dispatch routing</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Hazard Category</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`p-2.5 rounded-xl text-xs font-medium text-center border transition ${
                category === cat.id
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-md shadow-cyan-500/10'
                  : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Incident Description</label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what happened, any immediate dangers, or casualties..."
          className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none placeholder-slate-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <CameraCapture onFileSelected={setMediaFile} />
        <VoiceRecorder onAudioRecorded={setAudioFile} />
      </div>

      <LocationPicker onLocationChange={setLocation} />

      <div className="space-y-1">
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center">
          <Phone className="w-3.5 h-3.5 mr-1 text-cyan-400" /> Phone Number (Optional for updates)
        </label>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+91 98765 43210"
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 hover:opacity-95 transition flex items-center justify-center space-x-2"
      >
        <Send className="w-5 h-5" />
        <span>{submitting ? 'Submitting & Processing AI...' : 'Submit Incident Report'}</span>
      </button>
    </form>
  );
}
