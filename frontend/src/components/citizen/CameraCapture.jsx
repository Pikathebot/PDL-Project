import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Check } from 'lucide-react';

export default function CameraCapture({ onFileSelected }) {
  const [preview, setPreview] = useState(null);
  // Every URL.createObjectURL pins its Blob in memory until it is revoked.
  // Nothing revoked them before, so each re-pick leaked the previous photo (and
  // a video can be tens of megabytes) for the lifetime of the page.
  const previewRef = useRef(null);

  const setPreviewUrl = (url) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = url;
    setPreview(url);
  };

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
      onFileSelected(file);
    }
  };

  const clearCapture = () => {
    setPreviewUrl(null);
    onFileSelected(null);
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Photo / Evidence Media</label>
      {preview ? (
        <div className="relative rounded-2xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-input)] group">
          <img src={preview} alt="Captured preview" className="w-full h-36 object-cover" />
          <button
            type="button"
            onClick={clearCapture}
            className="absolute top-2 right-2 p-1.5 bg-slate-950/80 rounded-full text-slate-200 hover:text-red-400 transition"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-emerald-950/80 text-emerald-400 text-xs rounded-md flex items-center border border-emerald-500/30 font-bold">
            <Check className="w-3.5 h-3.5 mr-1" /> Media Attached
          </div>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center h-36 border-2 border-dashed border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-input)] hover:border-sky-500/50 transition cursor-pointer">
          <Camera className="w-7 h-7 text-sky-500 mb-1.5" />
          <span className="text-xs text-[var(--text-primary)] font-bold">Attach Photo / Video</span>
          <span className="text-[10px] text-[var(--text-muted)] mt-0.5">Photos are checked for EXIF location data</span>
          <input type="file" accept="image/*,video/*" onChange={handleFileChange} className="hidden" />
        </label>
      )}
    </div>
  );
}
