from typing import Optional, Dict, Any
from ai_pipeline.providers.factory import get_ai_provider


def _overrides_from_settings(provider_name: str) -> Dict[str, Any]:
    """
    Map backend .env keys onto provider constructor kwargs. Settings used to
    declare LMSTUDIO_API_URL / OPENAI_* but nothing read them, so editing .env
    silently did nothing - config.yaml was the only source of truth.
    """
    from backend.app.core.config import settings

    return {
        "llamaserver": {"api_url": settings.LLAMASERVER_API_URL, "model_name": settings.LLAMASERVER_MODEL},
        "llamacpp": {"model_path": settings.LLAMA_MODEL_PATH},
        "lmstudio": {"api_url": settings.LMSTUDIO_API_URL},
        "openai": {"api_url": settings.OPENAI_API_URL, "api_key": settings.OPENAI_API_KEY},
    }.get(provider_name, {})


class LLMExtractor:
    def __init__(self, provider_name: Optional[str] = None):
        if provider_name is None:
            from backend.app.core.config import settings
            provider_name = settings.AI_PROVIDER
        self.provider = get_ai_provider(provider_name, overrides=_overrides_from_settings(provider_name))

    async def extract_details(self, description: str) -> Dict[str, Any]:
        return await self.provider.extract_structured_data(description)


llm_extractor = LLMExtractor()
