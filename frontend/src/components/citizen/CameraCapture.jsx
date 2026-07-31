import React, { useState } from 'react';
import { Camera, X, Check } from 'lucide-react';

export default function CameraCapture({ onFileSelected }) {
  const [preview, setPreview] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
      onFileSelected(file);
    }
  };

  const clearCapture = () => {
    setPreview(null);
    onFileSelected(null);
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Photo / Evidence Media</label>
      {preview ? (
        <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 group">
          <img src={preview} alt="Captured preview" className="w-full h-44 object-cover" />
          <button
            type="button"
            onClick={clearCapture}
            className="absolute top-2 right-2 p-1.5 bg-slate-950/80 rounded-full text-slate-300 hover:text-red-400 transition"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-emerald-950/80 text-emerald-400 text-xs rounded-md flex items-center border border-emerald-500/30">
            <Check className="w-3.5 h-3.5 mr-1" /> Media Attached
          </div>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center h-36 border-2 border-dashed border-slate-700 rounded-xl bg-slate-900/60 hover:border-cyan-500/50 hover:bg-slate-900 transition cursor-pointer">
          <Camera className="w-8 h-8 text-cyan-400 mb-2" />
          <span className="text-sm text-slate-300 font-medium">Click to take photo or upload file</span>
          <span className="text-xs text-slate-500 mt-1">Supports JPG, PNG, MP4</span>
          <input type="file" accept="image/*,video/*" onChange={handleFileChange} className="hidden" />
        </label>
      )}
    </div>
  );
}
