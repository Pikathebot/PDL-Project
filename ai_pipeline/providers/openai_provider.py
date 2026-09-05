import json
import httpx
from typing import Dict, Any, Optional, List
from ai_pipeline.providers.base import AIProvider


class OpenAIProvider(AIProvider):
    """
    OpenAI-compatible API provider (OpenAI, Azure, or compatible endpoints).
    """

    def __init__(self, api_key: str, api_url: str = "https://api.openai.com/v1", model_name: str = "gpt-4o-mini", **kwargs):
        self.api_url = api_url.rstrip("/")
        self.api_key = api_key
        self.model_name = model_name

    async def generate(self, prompt: str, system_prompt: Optional[str] = None, max_tokens: int = 512) -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model_name,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": 0.2
        }

        headers = {"Authorization": f"Bearer {self.api_key}"}

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(f"{self.api_url}/chat/completions", json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            return f"[OpenAI API Error: {str(e)}]"

    async def extract_structured_data(self, incident_text: str) -> Dict[str, Any]:
        system_prompt = (
            "You are Sentinel Public Safety AI. Output strict JSON with keys: "
            "hazard_type, location_name, time_occurred, affected_people_count, severity_rating (1-5), summary."
        )
        res = await self.generate(incident_text, system_prompt=system_prompt)
        try:
            return json.loads(res)
        except json.JSONDecodeError:
            return {"summary": res, "parsed": False}

    async def get_embedding(self, text: str) -> List[float]:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.api_url}/embeddings",
                    json={"model": "text-embedding-3-small", "input": text},
                    headers={"Authorization": f"Bearer {self.api_key}"}
                )
                response.raise_for_status()
                data = response.json()
                return data["data"][0]["embedding"]
        except Exception:
            return [0.0] * 1536