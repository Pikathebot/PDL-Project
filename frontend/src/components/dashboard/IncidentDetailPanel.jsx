import React, { useState, useEffect } from 'react';
import { X, Cpu, Navigation, Send, CheckCircle2 } from 'lucide-react';
import { updateIncidentStatus, fetchNearestResponders, dispatchResponder } from '../../services/api';

const STATUS_OPTIONS = [
  'reported',
  'ai_processing',
  'verified',
  'dispatched',
  'in_progress',
  'resolved',
  'closed',
];

export default function IncidentDetailPanel({ incident, onClose, onUpdate }) {
  const [updating, setUpdating] = useState(false);
  const [responders, setResponders] = useState([]);
  const [loadingResponders, setLoadingResponders] = useState(false);
  const [dispatchingId, setDispatchingId] = useState(null);

  useEffect(() => {
    if (incident?.id) {
      setLoadingResponders(true);
      fetchNearestResponders(incident.id)
        .then((data) => setResponders(data))
        .catch(() => setResponders([]))
        .finally(() => setLoadingResponders(false));
    }
  }, [incident?.id]);

  if (!incident) return null;

  // `?? []` because IncidentRead omits the key for incidents created before
  // media support, and test fixtures do not always supply it.
  const attachments = incident.media_attachments ?? [];

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      const updated = await updateIncidentStatus(incident.id, newStatus);
      onUpdate(updated);
    } catch (err) {
      alert('Failed to update incident status.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDispatch = async (responderId) => {
    setDispatchingId(responderId);
    try {
      const updated = await dispatchResponder(incident.id, responderId);
      onUpdate(updated);
    } catch (err) {
      alert('Failed to dispatch responder.');
    } finally {
      setDispatchingId(null);
    }
  };

  return (
    <div className="theme-panel p-5 rounded-2xl space-y-4">
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-sky-500 font-mono font-bold">{incident.tracking_id}</span>
            <span className="px-2 py-0.5 text-[9px] font-bold rounded bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 uppercase">
              {incident.status}
            </span>
          </div>
          <h3 className="text-base font-bold text-[var(--text-primary)] capitalize mt-0.5">
            {incident.category.replace('_', ' ')}
          </h3>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3 text-xs">
        <div>
          <span className="text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[10px] block mb-1">Incident Report Description</span>
          <p className="p-3 bg-[var(--bg-input)] rounded-xl text-[var(--text-primary)] border border-[var(--border-subtle)] font-medium leading-relaxed">
            {incident.description}
          </p>
        </div>

        {/* Attached evidence. The backend has always stored and served these files
            and returned their paths on every read - nothing in the UI displayed
            them, while a hardcoded green "EXIF VERIFIED" badge stood in for real
            verification. Both the media and its actual validation state now show. */}
        <div className="space-y-1.5">
          <span className="text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[10px] block">
            Attached Evidence
          </span>
          {attachments.length === 0 ? (
            <p className="p-3 bg-[var(--bg-input)] rounded-xl text-[11px] text-[var(--text-muted)] italic border border-[var(--border-subtle)]">
              No media attached to this report.
            </p>
          ) : (
            <div className="space-y-2">
              {attachments.map((att) => (
                <div key={att.id} className="rounded-xl border border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-input)]">
                  {att.media_type === 'image' && (
                    <img src={att.file_path} alt="Incident evidence" className="w-full max-h-56 object-cover" />
                  )}
                  {att.media_type === 'audio' && (
                    <audio controls src={att.file_path} className="w-full p-2" />
                  )}
                  {att.media_type === 'video' && (
                    <video controls src={att.file_path} className="w-full max-h-56" />
                  )}
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">{att.media_type}</span>
                    <span className={`text-[9px] font-mono font-extrabold px-2 py-0.5 rounded-full border ${validationStyle(att)}`}>
                      {validationLabel(att)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 bg-[var(--bg-input)] rounded-xl border border-[var(--border-subtle)]">
            <span className="text-[var(--text-muted)] block text-[10px] uppercase">Severity</span>
            <span className="font-extrabold text-sm text-red-500 font-mono">{incident.severity} / 5</span>
          </div>
          <div className="p-2.5 bg-[var(--bg-input)] rounded-xl border border-[var(--border-subtle)]">
            <span className="text-[var(--text-muted)] block text-[10px] uppercase">Priority</span>
            <span className="font-extrabold text-sm text-sky-500 font-mono">{incident.priority_score}</span>
          </div>
          <div className="p-2.5 bg-[var(--bg-input)] rounded-xl border border-[var(--border-subtle)]">
            <span className="text-[var(--text-muted)] block text-[10px] uppercase">Evidence</span>
            <span className="font-extrabold text-xs text-[var(--text-primary)] font-mono">
              {attachments.length === 0
                ? 'NONE'
                : `${attachments.length} FILE${attachments.length === 1 ? '' : 'S'}`}
            </span>
          </div>
        </div>

        {incident.structured_details && (
          <div className="space-y-1">
            <span className="text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[10px] flex items-center">
              <Cpu className="w-3 h-3 mr-1 text-sky-500" /> AI Pipeline Extracted Schema
            </span>
            <pre className="p-3 bg-[var(--bg-input)] rounded-xl text-[10px] text-sky-500 font-mono overflow-x-auto border border-[var(--border-subtle)]">
              {JSON.stringify(incident.structured_details, null, 2)}
            </pre>
          </div>
        )}

        {/* Nearest Responder Dispatch Section (k-d Tree) */}
        <div className="pt-2 space-y-2 border-t border-[var(--border-subtle)]">
          <span className="text-[var(--text-muted)] font-bold uppercase tracking-wider text-[10px] flex items-center">
            <Navigation className="w-3 h-3 mr-1 text-emerald-500" /> Nearest Available Responders (k-d Tree Spatial Index)
          </span>

          {loadingResponders ? (
            <p className="text-[10px] text-[var(--text-muted)] italic">Querying spatial index...</p>
          ) : responders.length === 0 ? (
            <p className="text-[10px] text-[var(--text-muted)] italic p-2 bg-[var(--bg-input)] rounded-lg">No available responders in radius.</p>
          ) : (
            <div className="space-y-1.5">
              {responders.map((resp) => (
                <div key={resp.id} className="p-2.5 bg-[var(--bg-input)] rounded-xl border border-[var(--border-subtle)] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[var(--text-primary)] block text-xs">{resp.name}</span>
                    <span className="text-[10px] text-[var(--text-muted)] block">{resp.department} • {resp.distance_km} km away</span>
                  </div>
                  <button
                    disabled={dispatchingId === resp.id || incident.assigned_responder_id === resp.id}
                    onClick={() => handleDispatch(resp.id)}
                    className={`py-1 px-2.5 rounded-lg text-[10px] font-bold flex items-center transition border ${
                      incident.assigned_responder_id === resp.id
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-sky-500 hover:bg-sky-400 text-slate-950 border-sky-400 font-extrabold shadow'
                    }`}
                  >
                    {incident.assigned_responder_id === resp.id ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Dispatched
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3 mr-1" /> Dispatch
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
        <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
          Transition Status Lifecycle
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {STATUS_OPTIONS.map((st) => (
            <button
              key={st}
              disabled={updating}
              onClick={() => handleStatusChange(st)}
              className={`py-1.5 px-2 rounded-lg text-[9px] font-bold uppercase transition border ${
                incident.status === st
                  ? 'bg-sky-500 text-slate-950 border-sky-400 shadow font-extrabold'
                  : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Evidence badges are derived from the real MediaAttachment.validation_status
 * and exif_data written by the AI pipeline - never asserted.
 */
function validationLabel(att) {
  const drift = att.exif_data?.drift_meters;
  switch (att.validation_status) {
    case 'valid':
      return att.exif_data?.has_exif ? `GPS MATCH${drift != null ? ` (${Math.round(drift)} m)` : ''}` : 'NO EXIF DATA';
    case 'suspicious':
      return `LOCATION MISMATCH${drift != null ? ` (${Math.round(drift)} m)` : ''}`;
    case 'rejected':
      return 'REJECTED';
    default:
      return 'PENDING';
  }
}

function validationStyle(att) {
  switch (att.validation_status) {
    case 'valid':
      return att.exif_data?.has_exif
        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
        : 'bg-slate-500/10 border-slate-500/30 text-[var(--text-muted)]';
    case 'suspicious':
      return 'bg-amber-500/10 border-amber-500/30 text-amber-500';
    case 'rejected':
      return 'bg-red-500/10 border-red-500/30 text-red-500';
    default:
      return 'bg-slate-500/10 border-slate-500/30 text-[var(--text-muted)]';
  }
}
