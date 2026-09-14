from typing import Dict, Any, Optional, List
import httpx

from ai_pipeline.providers.base import AIProvider, ProviderUnavailableError
from ai_pipeline.nlp.embeddings import embeddings_engine


class OpenAICompatibleProvider(AIProvider):
    """
    Any server that speaks the OpenAI chat-completions protocol: llama.cpp's
    llama-server, LM Studio, OpenAI itself. Subclasses only change defaults.
    """

    name = "openai-compatible"

    def __init__(
        self,
        api_url: str,
        model_name: str,
        api_key: str = "",
        temperature: float = 0.2,
        timeout: float = 120.0,
        extra_body: Optional[Dict[str, Any]] = None,
        transport: Optional[httpx.AsyncBaseTransport] = None,
        **kwargs,
    ):
        self.api_url = api_url.rstrip("/")
        self.model_name = model_name
        self.api_key = api_key
        self.temperature = temperature
        # Local CPU inference of a 4B model can take well over the old 30s.
        self.timeout = timeout
        # Merged into every request body. llama-server uses it to switch off
        # chain-of-thought on thinking models (Qwen3, etc.): without
        # {"chat_template_kwargs": {"enable_thinking": false}} the whole token
        # budget goes into reasoning_content and `content` comes back empty.
        self.extra_body = extra_body or {}
        # Tests inject an httpx.MockTransport here; production leaves it None.
        self._transport = transport

    def _headers(self) -> Dict[str, str]:
        return {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}

    async def _chat(self, payload: Dict[str, Any]) -> str:
        try:
            async with httpx.AsyncClient(timeout=self.timeout, transport=self._transport) as client:
                response = await client.post(
                    f"{self.api_url}/chat/completions", json=payload, headers=self._headers()
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"].strip()
        except httpx.HTTPStatusError as exc:
            raise ProviderUnavailableError(
                f"{self.name} at {self.api_url} returned HTTP {exc.response.status_code}: "
                f"{exc.response.text[:200]}"
            ) from exc
        except httpx.HTTPError as exc:
            # str(ReadTimeout()) is empty, so name the class too.
            raise ProviderUnavailableError(
                f"{self.name} at {self.api_url} unreachable ({type(exc).__name__}: {exc})"
            ) from exc
        except (KeyError, IndexError, ValueError) as exc:
            raise ProviderUnavailableError(f"{self.name} returned an unexpected payload: {exc}") from exc

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 512,
        response_format: Optional[Dict[str, Any]] = None,
    ) -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload: Dict[str, Any] = {
            **self.extra_body,
            "model": self.model_name,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": self.temperature,
        }
        if response_format:
            payload["response_format"] = response_format

        try:
            return await self._chat(payload)
        except ProviderUnavailableError as exc:
            # Older servers reject response_format with a 400. The prompt already
            # demands JSON, so retry without the constraint before giving up.
            if response_format and "HTTP 400" in str(exc):
                payload.pop("response_format")
                return await self._chat(payload)
            raise

    async def get_embedding(self, text: str) -> List[float]:
        # Dedup compares vectors across incidents, so every provider must embed
        # with the same local model - a remote embedding space would not be
        # comparable to rows written by another backend.
        return embeddings_engine.generate_embedding(text).vector
