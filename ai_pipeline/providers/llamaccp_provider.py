import os
from typing import Dict, Any, Optional, List
from ai_pipeline.providers.base import AIProvider, ProviderUnavailableError
from ai_pipeline.nlp.embeddings import embeddings_engine


class LlamaCppProvider(AIProvider):
    """
    In-process llama.cpp loader via llama-cpp-python. Needs the `llama_cpp`
    wheel and a GGUF on disk; for the usual dev setup prefer the `llamaserver`
    provider, which talks to llama-server.exe over HTTP instead.
    """

    name = "llama.cpp"

    def __init__(self, model_path: str, n_ctx: int = 4096, n_gpu_layers: int = -1, temperature: float = 0.2, **kwargs):
        self.model_path = model_path
        self.model_name = os.path.basename(model_path)
        self.n_ctx = n_ctx
        self.n_gpu_layers = n_gpu_layers
        self.temperature = temperature
        self.llm = None  # Loaded lazily on first request
        self._load_error: Optional[str] = None

    def _load_model(self):
        if self.llm is not None or self._load_error is not None:
            return
        if not os.path.exists(self.model_path):
            self._load_error = f"model file not found: {self.model_path}"
            return
        try:
            from llama_cpp import Llama
            self.llm = Llama(
                model_path=self.model_path,
                n_ctx=self.n_ctx,
                n_gpu_layers=self.n_gpu_layers,
                verbose=False,
            )
        except Exception as exc:  # ImportError or a load failure
            self._load_error = f"{type(exc).__name__}: {exc}"

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 512,
        response_format: Optional[Dict[str, Any]] = None,
    ) -> str:
        self._load_model()
        if self.llm is None:
            raise ProviderUnavailableError(f"llama.cpp unavailable ({self._load_error})")

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        kwargs: Dict[str, Any] = {"max_tokens": max_tokens, "temperature": self.temperature}
        if response_format:
            kwargs["response_format"] = response_format
        response = self.llm.create_chat_completion(messages=messages, **kwargs)
        return response["choices"][0]["message"]["content"].strip()

    async def get_embedding(self, text: str) -> List[float]:
        return embeddings_engine.generate_embedding(text).vector
