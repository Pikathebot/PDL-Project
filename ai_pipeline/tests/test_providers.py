import json
import httpx
import pytest

from ai_pipeline.providers.base import AIProvider, ProviderUnavailableError, parse_structured_output
from ai_pipeline.providers.factory import get_ai_provider
from ai_pipeline.providers.llamaserver_provider import LlamaServerProvider

GOOD_RECORD = {
    "hazard_type": "electrical fire",
    "location_name": "Andheri sub-station",
    "time_occurred": "just now",
    "affected_people_count": None,
    "severity_rating": 4,
    "requires_immediate_response": True,
    "summary": "Sparks and smoke from a sub-station transformer.",
}


def _chat_response(content: str, status: int = 200) -> httpx.Response:
    return httpx.Response(status, json={"choices": [{"message": {"role": "assistant", "content": content}}]})


# --- parser -------------------------------------------------------------------

@pytest.mark.parametrize("raw", [
    json.dumps(GOOD_RECORD),
    "```json\n" + json.dumps(GOOD_RECORD) + "\n```",
    "Sure, here is the record:\n" + json.dumps(GOOD_RECORD) + "\nLet me know if you need more.",
])
def test_parse_structured_output_tolerates_fences_and_chatter(raw):
    assert parse_structured_output(raw) == GOOD_RECORD


def test_parse_structured_output_rejects_non_objects():
    assert parse_structured_output("") is None
    assert parse_structured_output("no json here") is None
    assert parse_structured_output("[1, 2, 3]") is None


# --- llama-server over HTTP ----------------------------------------------------

@pytest.mark.asyncio
async def test_llamaserver_extracts_with_json_schema_constraint():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["body"] = json.loads(request.content)
        return _chat_response(json.dumps(GOOD_RECORD))

    provider = LlamaServerProvider(transport=httpx.MockTransport(handler))
    result = await provider.extract_structured_data("Sparks flying from the sub-station transformer.")

    assert seen["url"] == "http://localhost:8080/v1/chat/completions"
    assert seen["body"]["response_format"]["type"] == "json_schema"
    assert seen["body"]["messages"][0]["role"] == "system"
    assert result["parsed"] is True and result["model_available"] is True
    assert result["severity_rating"] == 4
    assert result["hazard_type"] == "electrical fire"


@pytest.mark.asyncio
async def test_llamaserver_retries_without_response_format_on_400():
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content)
        calls.append("response_format" in body)
        if "response_format" in body:
            return httpx.Response(400, json={"error": "response_format not supported"})
        return _chat_response(json.dumps(GOOD_RECORD))

    provider = LlamaServerProvider(transport=httpx.MockTransport(handler))
    result = await provider.extract_structured_data("report")

    assert calls == [True, False]
    assert result["parsed"] is True


@pytest.mark.asyncio
async def test_llamaserver_unreachable_is_reported_not_faked():
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("connection refused")

    provider = LlamaServerProvider(transport=httpx.MockTransport(handler))

    with pytest.raises(ProviderUnavailableError):
        await provider.generate("hello")

    result = await provider.extract_structured_data("report text")
    assert result["model_available"] is False
    assert result["parsed"] is False
    assert result["raw_text"] == "report text"
    assert "unreachable" in result["error"]


@pytest.mark.asyncio
async def test_llamaserver_garbage_output_is_flagged_unparsed():
    provider = LlamaServerProvider(
        transport=httpx.MockTransport(lambda r: _chat_response("I cannot help with that."))
    )
    result = await provider.extract_structured_data("report")
    assert result == {"model_available": True, "parsed": False, "raw_output": "I cannot help with that."}


# --- factory -------------------------------------------------------------------

def test_factory_default_is_llamaserver():
    provider = get_ai_provider()
    assert isinstance(provider, LlamaServerProvider)
    assert provider.api_url == "http://localhost:8080/v1"


def test_factory_overrides_win_over_yaml_but_ignore_blanks():
    provider = get_ai_provider("llamaserver", overrides={"api_url": "http://10.0.0.5:9999/v1", "model_name": ""})
    assert provider.api_url == "http://10.0.0.5:9999/v1"
    assert provider.model_name == "local-gguf"


def test_factory_rejects_unknown_provider():
    with pytest.raises(ValueError, match="Unknown AI provider"):
        get_ai_provider("bard")


@pytest.mark.parametrize("name", ["llamacpp", "lmstudio"])
def test_factory_builds_every_local_provider(name):
    assert isinstance(get_ai_provider(name), AIProvider)


@pytest.mark.asyncio
async def test_llamacpp_without_weights_raises_instead_of_mocking():
    provider = get_ai_provider("llamacpp")
    with pytest.raises(ProviderUnavailableError, match="model file not found"):
        await provider.generate("Test fire hazard prompt")
