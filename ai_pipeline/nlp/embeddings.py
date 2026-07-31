from typing import List

class EmbeddingsEngine:
    """
    Sentence-transformers embedding generator for semantic deduplication.
    """
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model = None

    def _load_model(self):
        if self.model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self.model = SentenceTransformer(self.model_name)
            except Exception:
                self.model = None

    def generate_embedding(self, text: str) -> List[float]:
        self._load_model()
        if self.model is None:
            # Hash fallback vector for offline testing
            import hashlib
            h = hashlib.sha256(text.encode()).digest()
            return [(b / 255.0) for b in h[:16]] * 24  # 384 dimensions

        vec = self.model.encode(text)
        return vec.tolist()

embeddings_engine = EmbeddingsEngine()
