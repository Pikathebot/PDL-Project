from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List

class AIProvider(ABC):
    """
    Abstract AI Provider Bridge interface.
    Encapsulates LLM text processing, structured field extraction,
    and prompt generation regardless of backend implementation.
    """

    @abstractmethod
    async def generate(self, prompt: str, system_prompt: Optional[str] = None, max_tokens: int = 512) -> str:
        """Generate text completion from LLM backend."""
        pass

    @abstractmethod
    async def extract_structured_data(self, incident_text: str) -> Dict[str, Any]:
        """Extract structured JSON fields (what, where, when, who affected) from description."""
        pass

    @abstractmethod
    async def get_embedding(self, text: str) -> List[float]:
        """Generate vector embedding for semantic comparison."""
        pass
