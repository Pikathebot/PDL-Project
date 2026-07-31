import pytest
from ai_pipeline.providers.factory import get_ai_provider
from ai_pipeline.providers.base import AIProvider

@pytest.mark.asyncio
async def test_ai_provider_factory_loading():
    provider = get_ai_provider("llamacpp")
    assert isinstance(provider, AIProvider)
    
    # Test generation fallback execution
    res = await provider.generate("Test fire hazard prompt")
    assert isinstance(res, str)
    assert len(res) > 0

@pytest.mark.asyncio
async def test_lmstudio_provider_loading():
    provider = get_ai_provider("lmstudio")
    assert isinstance(provider, AIProvider)
