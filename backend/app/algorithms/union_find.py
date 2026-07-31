import math
from typing import Dict, List, Tuple, Any

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates distance between two lat/lon pairs in meters using Haversine formula."""
    R = 6371000  # Radius of Earth in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Calculates cosine similarity between two vector embeddings."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot_product = sum(a * b for a, b in zip(v1, v2))
    norm_a = math.sqrt(sum(a * a for a in v1))
    norm_b = math.sqrt(sum(b * b for b in v2))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot_product / (norm_a * norm_b)

class UnionFind:
    """
    Disjoint Set Union (DSU) data structure with path compression and union by rank.
    Used for merging duplicate reports referring to the same incident event.
    """
    def __init__(self, elements: List[int]):
        self.parent = {el: el for el in elements}
        self.rank = {el: 0 for el in elements}

    def find(self, i: int) -> int:
        if self.parent[i] == i:
            return i
        self.parent[i] = self.find(self.parent[i])  # Path compression
        return self.parent[i]

    def union(self, i: int, j: int) -> bool:
        root_i = self.find(i)
        root_j = self.find(j)

        if root_i == root_j:
            return False

        # Union by rank
        if self.rank[root_i] < self.rank[root_j]:
            self.parent[root_i] = root_j
        elif self.rank[root_i] > self.rank[root_j]:
            self.parent[root_j] = root_i
        else:
            self.parent[root_j] = root_i
            self.rank[root_i] += 1
        return True

    def get_clusters(self) -> Dict[int, List[int]]:
        clusters = {}
        for item in self.parent:
            root = self.find(item)
            if root not in clusters:
                clusters[root] = []
            clusters[root].append(item)
        return clusters

def evaluate_incident_duplication(inc1: Dict[str, Any], inc2: Dict[str, Any]) -> bool:
    """
    Evaluates whether two reports refer to the same event:
    1. Distance <= 200 meters
    2. Time difference <= 2 hours (7200 seconds)
    3. Embedding Cosine Similarity >= 0.75
    """
    dist = haversine_distance(inc1["latitude"], inc1["longitude"], inc2["latitude"], inc2["longitude"])
    if dist > 200.0:
        return False

    time_diff_sec = abs((inc1["created_at"] - inc2["created_at"]).total_seconds())
    if time_diff_sec > 7200.0:
        return False

    sim = cosine_similarity(inc1.get("vector", []), inc2.get("vector", []))
    return sim >= 0.75
