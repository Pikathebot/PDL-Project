import json
import re
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List


class ProviderUnavailableError(RuntimeError):
    """
    The provider could not produce a completion: no weights on disk, server not
    running, HTTP failure, etc. Raised rather than returned as text so a mock
    string can never be stored as if it were model output.
    """


# Shared extraction contract. Every provider asks for the same fields so the
# dispatcher UI and the dedup/priority code can rely on one shape regardless
# of which backend produced it.
EXTRACTION_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "hazard_type": {
            "type": "string",
            "description": "Short label for the hazard, e.g. 'road accident', 'electrical fire', 'flooding'.",
        },
        "location_name": {
            "type": ["string", "null"],
            "description": "Place, road or landmark named in the report, or null if none.",
        },
        "time_occurred": {
            "type": ["string", "null"],
            "description": "When it happened as stated by the reporter ('10 minutes ago', 'this morning'), or null.",
        },
        "affected_people_count": {
            "type": ["integer", "null"],
            "description": "Number of people injured, trapped or at risk if stated, else null.",
        },
        "severity_rating": {
            "type": "integer",
            "minimum": 1,
            "maximum": 5,
            "description": "1 = minor nuisance, 3 = needs a responder, 5 = life-threatening / spreading.",
        },
        "requires_immediate_response": {"type": "boolean"},
        "summary": {
            "type": "string",
            "description": "One sentence a dispatcher can read in two seconds.",
        },
    },
    "required": [
        "hazard_type",
        "location_name",
        "time_occurred",
        "affected_people_count",
        "severity_rating",
        "requires_immediate_response",
        "summary",
    ],
    "additionalProperties": False,
}

EXTRACTION_SYSTEM_PROMPT = (
    "You are Sentinel, a public-safety triage assistant for an emergency dispatch centre. "
    "Read a citizen's incident report and extract a structured record. "
    "Reply with a single JSON object only - no prose, no markdown fences - with exactly these keys:\n"
    "  hazard_type (string), location_name (string|null), time_occurred (string|null), "
    "affected_people_count (integer|null), severity_rating (integer 1-5), "
    "requires_immediate_response (boolean), summary (string).\n"
    "Use null when the report does not say. Never invent people counts or places.\n"
    "Example:\n"
    'Report: "Two cars collided near Andheri flyover about 10 minutes ago, one driver is bleeding."\n'
    '{"hazard_type": "road accident", "location_name": "Andheri flyover", "time_occurred": "about 10 minutes ago", '
    '"affected_people_count": 1, "severity_rating": 4, "requires_immediate_response": true, '
    '"summary": "Two-car collision at Andheri flyover with one injured driver."}'
)

_FENCE_RE = re.compile(r"```(?:json)?\s*(.*?)```", re.DOTALL)


def parse_structured_output(raw: str) -> Optional[Dict[str, Any]]:
    """
    Pull a JSON object out of model output that may be wrapped in fences or
    surrounded by chatter. Returns None if no object can be decoded.
    """
    if not raw:
        return None
    candidates = [raw.strip()]
    candidates += [m.strip() for m in _FENCE_RE.findall(raw)]
    # Widest brace span, for the "Sure! Here is the JSON: {...} Let me know" case.
    start, end = raw.find("{"), raw.rfind("}")
    if start != -1 and end > start:
        candidates.append(raw[start:end + 1])

    for text in candidates:
        try:
            obj = json.loads(text)
        except json.JSONDecodeError:
            continue
        if isinstance(obj, dict):
            return obj
    return None


class AIProvider(ABC):
    """
    Abstract AI Provider Bridge interface.
    Encapsulates LLM text processing, structured field extraction,
    and prompt generation regardless of backend implementation.
    """

    #: Reported in the incident's ai_provenance so the UI can say which backend ran.
    name: str = "unknown"
    model_name: str = "unknown"

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 512,
        response_format: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Generate a text completion. Raises ProviderUnavailableError when the
        backend cannot answer; never returns a placeholder.
        """

    async def extract_structured_data(self, incident_text: str) -> Dict[str, Any]:
        """
        Extract the EXTRACTION_SCHEMA fields from a report.

        Always returns a dict carrying `model_available` and `parsed` so the
        caller can tell "model ran and produced this" from "nothing ran".
        """
        try:
            raw = await self.generate(
                f"Report: {incident_text}",
                system_prompt=EXTRACTION_SYSTEM_PROMPT,
                max_tokens=400,
                response_format={
                    "type": "json_schema",
                    "json_schema": {"name": "incident_extraction", "schema": EXTRACTION_SCHEMA},
                },
            )
        except ProviderUnavailableError as exc:
            return {
                "model_available": False,
                "parsed": False,
                "raw_text": incident_text,
                "error": str(exc),
            }

        parsed = parse_structured_output(raw)
        if parsed is None:
            return {"model_available": True, "parsed": False, "raw_output": raw}
        return {**parsed, "model_available": True, "parsed": True}

    @abstractmethod
    async def get_embedding(self, text: str) -> List[float]:
        """Generate vector embedding for semantic comparison."""
