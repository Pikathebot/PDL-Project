import math
from typing import Dict, List, Tuple, Any

# Duplicate-detection thresholds. Two reports describe the same event only if
# they are close in space, close in time, AND semantically similar.
DUPLICATE_DISTANCE_METERS = 200.0
DUPLICATE_TIME_WINDOW_SECONDS = 7200.0  # 2 hours

# Calibrated against all-MiniLM-L6-v2 on 8 hand-written duplicate pairs (the same
# event described by two different citizens) and 8 non-duplicate pairs, including
# same-category-different-event cases:
#
#   duplicates      0.41 0.59 0.67 0.69 0.69 0.73 0.84 0.89
#   non-duplicates -0.01 0.06 0.09 0.11 0.22 0.22 0.23 0.35
#
# 0.55 clears every non-duplicate by ~0.2 and catches 7 of the 8 duplicates. The
# miss is instructive rather than fixable here: "Live electric wire hanging low"
# vs "Exposed power line dangling over the street" scores 0.41 - synonymous, but
# sharing no vocabulary, which is exactly where a 384-dim MiniLM runs out. No
# threshold catches that pair without also merging unrelated reports, so it stays
# uncaught and the dispatcher sees two incidents.
#
# The old value of 0.75 was tuned against the SHA-256 fallback, whose vectors are
# all-positive and therefore score ~0.81 for *any* pair of texts. Carried over to
# real embeddings it landed above most genuine duplicates, so nothing would ever
# have clustered.
#
# The asymmetry is deliberate. Missing a duplicate leaves two incidents on the
# dispatcher's queue - visible, and a human resolves it. A false merge hides a
# real emergency behind an unrelated one. When in doubt, do not merge.
#
# This constant is tied to the model in ai_pipeline.nlp.embeddings; changing the
# model means re-running this calibration.
DUPLICATE_SIMILARITY_THRESHOLD = 0.55

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
    0. Both sides carry a real semantic embedding
    1. Distance <= 200 meters
    2. Time difference <= 2 hours (7200 seconds)
    3. Embedding Cosine Similarity >= DUPLICATE_SIMILARITY_THRESHOLD

    Rule 0 exists because the offline hash fallback in
    ai_pipeline.nlp.embeddings produces all-positive vectors whose pairwise
    cosine similarity averages ~0.81 for completely unrelated text, regardless of
    the threshold. Clustering on those merges a fire report into a pothole
    report. Refusing to cluster is the correct degradation; guessing is not.

    Incidents persisted before provenance was recorded have no `is_semantic`
    key, so the default of False correctly distrusts exactly the rows that were
    written using the fallback.
    """
    if not (inc1.get("is_semantic", False) and inc2.get("is_semantic", False)):
        return False

    dist = haversine_distance(inc1["latitude"], inc1["longitude"], inc2["latitude"], inc2["longitude"])
    if dist > DUPLICATE_DISTANCE_METERS:
        return False

    time_diff_sec = abs((inc1["created_at"] - inc2["created_at"]).total_seconds())
    if time_diff_sec > DUPLICATE_TIME_WINDOW_SECONDS:
        return False

    sim = cosine_similarity(inc1.get("vector", []), inc2.get("vector", []))
    return sim >= DUPLICATE_SIMILARITY_THRESHOLD
