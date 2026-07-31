import React, { useState } from 'react';
import { Mic, Square, Check, RefreshCw } from 'lucide-react';

export default function VoiceRecorder({ onAudioRecorded }) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        const file = new File([blob], 'voicenote.webm', { type: 'audio/webm' });
        onAudioRecorded(file);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch (err) {
      alert('Microphone access denied or unsupported.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  const resetAudio = () => {
    setAudioUrl(null);
    onAudioRecorded(null);
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Voice Note (Optional)</label>
      {audioUrl ? (
        <div className="p-3 bg-slate-900 border border-slate-700 rounded-xl flex items-center justify-between">
          <audio src={audioUrl} controls className="h-8 max-w-[220px]" />
          <button type="button" onClick={resetAudio} className="p-1.5 text-slate-400 hover:text-cyan-400">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          className={`w-full py-3 px-4 rounded-xl font-medium flex items-center justify-center space-x-2 transition ${
            recording
              ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse'
              : 'bg-slate-900 text-slate-300 border border-slate-700 hover:border-cyan-500/50'
          }`}
        >
          {recording ? (
            <>
              <Square className="w-4 h-4" />
              <span>Stop Recording...</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4 text-cyan-400" />
              <span>Record Audio Description</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
