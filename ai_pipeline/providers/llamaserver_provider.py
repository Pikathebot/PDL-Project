from ai_pipeline.providers.openai_compat import OpenAICompatibleProvider


class LlamaServerProvider(OpenAICompatibleProvider):
    """
    llama.cpp's `llama-server.exe` (OpenAI-compatible HTTP, default port 8080).

    Start it with e.g.
        llama-server -m /path/to/model.gguf --port 8080 -c 4096
    The server serves whichever GGUF it was launched with, so `model_name` is
    only a label echoed back in ai_provenance.
    """

    name = "llama-server"

    def __init__(self, api_url: str = "http://localhost:8080/v1", model_name: str = "local-gguf", **kwargs):
        super().__init__(api_url=api_url, model_name=model_name, **kwargs)
