import os
from typing import Dict, Any

class WhisperTranscriber:
    """
    Speech-to-text transcriber using Whisper engine.
    """
    def __init__(self, model_size: str = "base"):
        self.model_size = model_size
        self.model = None

    def _load_model(self):
        if self.model is None:
            try:
                import whisper
                self.model = whisper.load_model(self.model_size)
            except Exception:
                self.model = None

    def transcribe(self, audio_path: str) -> Dict[str, Any]:
        self._load_model()
        if self.model is None or not os.path.exists(audio_path):
            # Previously this returned a fabricated sentence about a flyover
            # collision. That text was indistinguishable from a real transcript
            # and would have polluted the incident description, the LLM prompt
            # and the embedding used for deduplication.
            return {
                "model_available": False,
                "text": "",
                "language": None,
                "confidence": None,
                "note": "Whisper not installed - audio was not transcribed",
            }

        result = self.model.transcribe(audio_path)
        return {
            "model_available": True,
            "text": result.get("text", "").strip(),
            "language": result.get("language", "en"),
            "confidence": 0.90,
        }

whisper_transcriber = WhisperTranscriber()
