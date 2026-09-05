import json
from typing import Dict, Any, Optional, List
from ai_pipeline.providers.base import AIProvider
from ai_pipeline.nlp.embeddings import embeddings_engine

class LlamaCppProvider(AIProvider):
    """
    Local llama.cpp engine loader for Gemma-4-e4b-qat (Unsloth text-only).
    """

    def __init__(self, model_path: str, n_ctx: int = 4096, n_gpu_layers: int = -1, **kwargs):
        self.model_path = model_path
        self.n_ctx = n_ctx
        self.n_gpu_layers = n_gpu_layers
        self.llm = None  # Loaded lazily on first request

    def _load_model(self):
        if self.llm is None:
            try:
                from llama_cpp import Llama
                self.llm = Llama(
                    model_path=self.model_path,
                    n_ctx=self.n_ctx,
                    n_gpu_layers=self.n_gpu_layers,
                    verbose=False
                )
            except Exception as e:
                # Return fallback / mock mode if model weights file is not present locally yet
                self.llm = None

    async def generate(self, prompt: str, system_prompt: Optional[str] = None, max_tokens: int = 512) -> str:
        self._load_model()
        if self.llm is None:
            return f"[Mock llama.cpp response to: {prompt[:30]}...]"

        formatted_prompt = f"System: {system_prompt or 'You are Sentinel AI.'}\nUser: {prompt}\nAssistant:"
        response = self.llm(formatted_prompt, max_tokens=max_tokens)
        return response['choices'][0]['text'].strip()

    async def extract_structured_data(self, incident_text: str) -> Dict[str, Any]:
        system_prompt = (
            "You are Sentinel Public Safety AI. Extract structured JSON object with keys: "
            "hazard_type, location_name, time_occurred, affected_people_count, severity_rating (1-5), details."
        )
        raw_output = await self.generate(incident_text, system_prompt=system_prompt)
        try:
            return json.loads(raw_output)
        except json.JSONDecodeError:
            return {
                "raw_text": incident_text,
                "parsed": False,
                "extracted_details": raw_output
            }

    async def get_embedding(self, text: str) -> List[float]:
        # The AIProvider contract is a bare vector; provenance is recorded by the
        # caller that persists it (backend/app/tasks/ai_tasks.py).
        return embeddings_engine.generate_embedding(text).vector
