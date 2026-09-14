from ai_pipeline.providers.openai_compat import OpenAICompatibleProvider


class OpenAIProvider(OpenAICompatibleProvider):
    """OpenAI (or any hosted OpenAI-compatible endpoint that needs a bearer key)."""

    name = "openai"

    def __init__(self, api_key: str, api_url: str = "https://api.openai.com/v1", model_name: str = "gpt-4o-mini", **kwargs):
        super().__init__(api_url=api_url, model_name=model_name, api_key=api_key, **kwargs)
