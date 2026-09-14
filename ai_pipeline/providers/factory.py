import os
from typing import Optional, Dict, Any
import yaml

from ai_pipeline.providers.base import AIProvider
from ai_pipeline.providers.llamaccp_provider import LlamaCppProvider
from ai_pipeline.providers.llamaserver_provider import LlamaServerProvider
from ai_pipeline.providers.lmstudio_provider import LMStudioProvider
from ai_pipeline.providers.openai_provider import OpenAIProvider

CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config.yaml")

PROVIDERS = {
    "llamaserver": LlamaServerProvider,
    "llamacpp": LlamaCppProvider,
    "lmstudio": LMStudioProvider,
    "openai": OpenAIProvider,
}


def _resolve_api_key(provider_config: dict) -> dict:
    """
    config.yaml names the *environment variable* holding the key (`api_key_env`),
    never the key itself, so the secret is not committed. OpenAIProvider takes the
    key itself, so translate here - passing the config through untouched raised
    `TypeError: __init__() missing 1 required positional argument: 'api_key'`.
    """
    resolved = dict(provider_config)
    env_name = resolved.pop("api_key_env", None)
    if not resolved.get("api_key"):
        resolved["api_key"] = os.environ.get(env_name, "") if env_name else ""
    return resolved


def _load_config() -> Dict[str, Any]:
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, "r") as f:
            return yaml.safe_load(f) or {}
    return {"default_provider": "llamaserver", "providers": {}}


def get_ai_provider(provider_name: Optional[str] = None, overrides: Optional[Dict[str, Any]] = None) -> AIProvider:
    """
    Build the provider named by `provider_name` (else config.yaml's
    default_provider). `overrides` are constructor kwargs layered on top of the
    yaml block - the backend passes its .env values through here so an operator
    can point at a different server without editing config.yaml.
    """
    config = _load_config()
    target_provider = provider_name or config.get("default_provider", "llamaserver")
    if target_provider not in PROVIDERS:
        raise ValueError(
            f"Unknown AI provider '{target_provider}'. Choose one of: {', '.join(PROVIDERS)}."
        )

    provider_config = dict(config.get("providers", {}).get(target_provider, {}))
    provider_config.update({k: v for k, v in (overrides or {}).items() if v not in (None, "")})

    if target_provider == "openai":
        provider_config = _resolve_api_key(provider_config)
        if not provider_config["api_key"]:
            raise ValueError(
                "The 'openai' provider is selected but no API key is set. "
                "Set OPENAI_API_KEY or switch AI_PROVIDER / default_provider to llamaserver."
            )

    return PROVIDERS[target_provider](**provider_config)
