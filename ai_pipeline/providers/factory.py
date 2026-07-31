import os
import yaml
from typing import Optional
from ai_pipeline.providers.base import AIProvider
from ai_pipeline.providers.llamaccp_provider import LlamaCppProvider
from ai_pipeline.providers.lmstudio_provider import LMStudioProvider

CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config.yaml")

def get_ai_provider(provider_name: Optional[str] = None) -> AIProvider:
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, "r") as f:
            config = yaml.safe_load(f)
    else:
        config = {"default_provider": "llamacpp", "providers": {}}

    target_provider = provider_name or config.get("default_provider", "llamacpp")
    provider_config = config.get("providers", {}).get(target_provider, {})

    if target_provider == "lmstudio":
        return LMStudioProvider(**provider_config)
    else:
        return LlamaCppProvider(**provider_config)
