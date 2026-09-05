from typing import Optional, Dict, Any
from ai_pipeline.providers.factory import get_ai_provider


class LLMExtractor:
    def __init__(self, provider_name: Optional[str] = None):
        # settings.AI_PROVIDER existed but nothing read it - this defaulted to a
        # hardcoded "llamacpp", so switching providers in config had no effect.
        # None lets the factory fall back to config.yaml's default_provider.
        if provider_name is None:
            from backend.app.core.config import settings
            provider_name = settings.AI_PROVIDER
        self.provider = get_ai_provider(provider_name)

    async def extract_details(self, description: str) -> Dict[str, Any]:
        return await self.provider.extract_structured_data(description)

llm_extractor = LLMExtractor()
