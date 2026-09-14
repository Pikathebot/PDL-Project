from ai_pipeline.providers.openai_compat import OpenAICompatibleProvider


class LMStudioProvider(OpenAICompatibleProvider):
    """LM Studio local REST server (OpenAI-compatible, default port 1234)."""

    name = "lmstudio"

    def __init__(self, api_url: str = "http://localhost:1234/v1", model_name: str = "gemma-4-e4b-qat", **kwargs):
        super().__init__(api_url=api_url, model_name=model_name, **kwargs)
