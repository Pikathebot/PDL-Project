import hashlib
from dataclasses import dataclass
from typing import List

FALLBACK_MODEL_NAME = "sha256-fallback"
EMBEDDING_DIMENSIONS = 384


@dataclass(frozen=True)
class EmbeddingResult:
    """
    An embedding plus the provenance of whatever produced it.

    `is_semantic` is the load-bearing field: only a real sentence-transformers
    model produces vectors whose cosine similarity means anything. The hash
    fallback produces all-positive vectors whose pairwise similarity sits around
    0.81 regardless of the input text - comfortably above the 0.75 duplicate
    threshold - so treating it as semantic merges unrelated incidents.
    """
    vector: List[float]
    model: str
    is_semantic: bool


class EmbeddingsEngine:
    """
    Sentence-transformers embedding generator for semantic deduplication.

    Falls back to a deterministic hash vector when the model is unavailable so
    the pipeline still runs offline - but the result is flagged non-semantic so
    downstream clustering refuses to use it.
    """
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model = None
        self._load_attempted = False

    def _load_model(self):
        if self.model is None and not self._load_attempted:
            self._load_attempted = True
            try:
                from sentence_transformers import SentenceTransformer
                self.model = SentenceTransformer(self.model_name)
            except Exception:
                self.model = None

    def generate_embedding(self, text: str) -> EmbeddingResult:
        self._load_model()

        if self.model is None:
            # Deterministic stand-in so the pipeline runs offline. NOT a semantic
            # embedding - see EmbeddingResult.is_semantic.
            h = hashlib.sha256(text.encode()).digest()
            vector = [(b / 255.0) for b in h[:16]] * 24  # 384 dimensions
            return EmbeddingResult(vector=vector, model=FALLBACK_MODEL_NAME, is_semantic=False)

        vector = self.model.encode(text).tolist()
        return EmbeddingResult(vector=vector, model=self.model_name, is_semantic=True)


embeddings_engine = EmbeddingsEngine()
