import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, RefreshCw } from 'lucide-react';

export default function VoiceRecorder({ onAudioRecorded }) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  // Stopping a MediaRecorder does not release the microphone - only stopping
  // the stream's tracks does. Without this the browser's recording indicator
  // stayed lit for the lifetime of the page after a single voice note.
  const streamRef = useRef(null);
  const audioUrlRef = useRef(null);

  const releaseMic = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const setAudio = (url) => {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = url;
    setAudioUrl(url);
  };

  useEffect(() => () => {
    releaseMic();
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        releaseMic();
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudio(URL.createObjectURL(blob));
        const file = new File([blob], 'voicenote.webm', { type: 'audio/webm' });
        onAudioRecorded(file);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch (err) {
      releaseMic();
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
    setAudio(null);
    onAudioRecorded(null);
  };

  return (
    <div className="space-y-1.5">
      {/* Was "Voice Note (Whisper STT)". Transcription only happens when Whisper
          is actually installed; the label promised it unconditionally. */}
      <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Voice Note</label>
      {audioUrl ? (
        <div className="p-3 bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-2xl flex items-center justify-between">
          <audio src={audioUrl} controls className="h-8 max-w-[200px]" />
          <button type="button" onClick={resetAudio} className="p-1.5 text-[var(--text-muted)] hover:text-sky-500">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          className={`w-full h-36 rounded-2xl font-bold text-xs flex flex-col items-center justify-center space-y-1.5 transition border ${
            recording
              ? 'bg-red-500/20 text-red-500 border-red-500/50 radar-emergency'
              : 'bg-[var(--bg-input)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:border-sky-500/50'
          }`}
        >
          {recording ? (
            <>
              <Square className="w-6 h-6 text-red-500" />
              <span>Recording Voice Note...</span>
            </>
          ) : (
            <>
              <Mic className="w-6 h-6 text-sky-500" />
              <span>Record Voice Note</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
