from typing import Dict, Any
from ai_pipeline.providers.factory import get_ai_provider

class LLMExtractor:
    def __init__(self, provider_name: str = "llamacpp"):
        self.provider = get_ai_provider(provider_name)

    async def extract_details(self, description: str) -> Dict[str, Any]:
        return await self.provider.extract_structured_data(description)

llm_extractor = LLMExtractor()
