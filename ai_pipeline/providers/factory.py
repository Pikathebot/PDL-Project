import os
import yaml
from typing import Optional
from ai_pipeline.providers.base import AIProvider
from ai_pipeline.providers.llamaccp_provider import LlamaCppProvider
from ai_pipeline.providers.lmstudio_provider import LMStudioProvider
from ai_pipeline.providers.openai_provider import OpenAIProvider

CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config.yaml")


def _resolve_api_key(provider_config: dict) -> dict:
    """
    config.yaml names the *environment variable* holding the key (`api_key_env`),
    never the key itself, so the secret is not committed. OpenAIProvider takes the
    key itself, so translate here - passing the config through untouched raised
    `TypeError: __init__() missing 1 required positional argument: 'api_key'`.
    """
    resolved = dict(provider_config)
    env_name = resolved.pop("api_key_env", None)
    if "api_key" not in resolved:
        resolved["api_key"] = os.environ.get(env_name, "") if env_name else ""
    return resolved


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
    elif target_provider == "openai":
        openai_config = _resolve_api_key(provider_config)
        if not openai_config["api_key"]:
            raise ValueError(
                "The 'openai' provider is selected but no API key is set. "
                f"Export {provider_config.get('api_key_env', 'OPENAI_API_KEY')} "
                "or switch default_provider in ai_pipeline/config.yaml."
            )
        return OpenAIProvider(**openai_config)
    else:
        return LlamaCppProvider(**provider_config)
