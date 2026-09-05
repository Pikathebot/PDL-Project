import random
from datetime import datetime, timedelta
import pytest
from backend.app.algorithms.union_find import (
    UnionFind,
    haversine_distance,
    cosine_similarity,
    evaluate_incident_duplication,
    DUPLICATE_SIMILARITY_THRESHOLD,
)
from ai_pipeline.nlp.embeddings import embeddings_engine
from backend.app.algorithms.priority_queue import calculate_priority_score, IncidentPriorityQueue
from backend.app.algorithms.kd_tree import KDTree

def test_haversine_distance():
    # Mumbai Marine Drive to Gateway of India (~2.4 km)
    d = haversine_distance(18.9440, 72.8230, 18.9220, 72.8347)
    assert 2000.0 < d < 3000.0

def test_union_find_clustering():
    dsu = UnionFind([1, 2, 3, 4])
    dsu.union(1, 2)
    dsu.union(2, 3)
    assert dsu.find(1) == dsu.find(3)
    assert dsu.find(1) != dsu.find(4)

def test_incident_duplication_check():
    now = datetime.utcnow()
    inc1 = {"latitude": 19.0760, "longitude": 72.8777, "created_at": now, "vector": [0.1, 0.2, 0.3], "is_semantic": True}
    inc2 = {"latitude": 19.0761, "longitude": 72.8778, "created_at": now + timedelta(minutes=5), "vector": [0.1, 0.2, 0.31], "is_semantic": True}
    assert evaluate_incident_duplication(inc1, inc2) is True


def test_duplication_rejects_non_semantic_embeddings():
    """
    The offline hash fallback yields ~0.81 cosine similarity for unrelated text,
    above any workable threshold. Same place, same time, near-identical vectors
    must still refuse to merge when the embedding is not semantic.
    """
    now = datetime.utcnow()
    inc1 = {"latitude": 19.0760, "longitude": 72.8777, "created_at": now, "vector": [0.1, 0.2, 0.3], "is_semantic": False}
    inc2 = {"latitude": 19.0760, "longitude": 72.8777, "created_at": now, "vector": [0.1, 0.2, 0.3], "is_semantic": False}
    assert evaluate_incident_duplication(inc1, inc2) is False


def test_legacy_embedding_without_provenance_is_not_clustered():
    """Rows persisted before provenance existed used the fallback - distrust them."""
    now = datetime.utcnow()
    legacy = {"latitude": 19.0760, "longitude": 72.8777, "created_at": now, "vector": [0.1, 0.2, 0.3]}
    assert evaluate_incident_duplication(legacy, dict(legacy)) is False


def test_duplication_rejects_dissimilar_semantic_vectors():
    """Real embeddings that genuinely differ must not merge."""
    now = datetime.utcnow()
    inc1 = {"latitude": 19.0760, "longitude": 72.8777, "created_at": now, "vector": [1.0, 0.0, 0.0], "is_semantic": True}
    inc2 = {"latitude": 19.0760, "longitude": 72.8777, "created_at": now, "vector": [0.0, 1.0, 0.0], "is_semantic": True}
    assert evaluate_incident_duplication(inc1, inc2) is False


def test_unrelated_incident_text_does_not_merge_end_to_end():
    """
    Regression lock for the audit finding: a fire report and a pothole report
    filed at the same spot minutes apart must never become one incident.
    """
    now = datetime.utcnow()

    def incident(text):
        e = embeddings_engine.generate_embedding(text)
        return {"latitude": 19.0760, "longitude": 72.8777, "created_at": now,
                "vector": e.vector, "is_semantic": e.is_semantic}

    fire = incident("Building fire with thick smoke pouring from the second floor")
    pothole = incident("Large pothole causing traffic delay on the highway")
    assert evaluate_incident_duplication(fire, pothole) is False


def test_genuine_duplicate_reports_do_merge():
    """
    The other half of the regression lock. Refusing to merge everything is a
    correct-but-useless deduplicator; this asserts the Union-Find clustering
    still fires when two citizens really do report the same event.

    Skipped when sentence-transformers is absent, because the hash fallback is
    deliberately barred from clustering at all.
    """
    result = embeddings_engine.generate_embedding("probe")
    if not result.is_semantic:
        pytest.skip("sentence-transformers not installed - clustering is inert by design")

    now = datetime.utcnow()

    def incident(text, lon=72.8777):
        e = embeddings_engine.generate_embedding(text)
        return {"latitude": 19.0760, "longitude": lon, "created_at": now,
                "vector": e.vector, "is_semantic": e.is_semantic}

    a = incident("Building fire with thick smoke pouring from the second floor")
    b = incident("Fire in a building, heavy smoke coming out of the upper floor")
    assert evaluate_incident_duplication(a, b) is True

    # Same text, but 6km away - the geo gate must still veto the merge.
    assert evaluate_incident_duplication(a, incident(
        "Fire in a building, heavy smoke coming out of the upper floor", lon=72.9500)) is False


def test_similarity_threshold_separates_real_duplicate_populations():
    """
    Guards the calibration in union_find. DUPLICATE_SIMILARITY_THRESHOLD was
    0.75, a value tuned against the hash fallback's inflated ~0.81 baseline.
    Carried over to real embeddings it sat above most genuine duplicates, so
    nothing would ever have clustered. This asserts the threshold still lands
    between the two populations if the model or the constant is changed.
    """
    result = embeddings_engine.generate_embedding("probe")
    if not result.is_semantic:
        pytest.skip("sentence-transformers not installed")

    def sim(a, b):
        return cosine_similarity(
            embeddings_engine.generate_embedding(a).vector,
            embeddings_engine.generate_embedding(b).vector,
        )

    duplicates = [
        ("Building fire with thick smoke", "Fire in a building, heavy smoke pouring out"),
        ("Car crash at the flyover, two vehicles", "Accident on the flyover involving 2 cars"),
        ("Water logging on the main road", "Road is flooded, water everywhere"),
        ("Live electric wire hanging low", "Exposed power line dangling over the street"),
    ]
    non_duplicates = [
        ("Building fire with thick smoke", "Pothole causing traffic delay"),
        ("Car crash at the flyover", "Water logging on the main road"),
        ("Live electric wire hanging low", "Man collapsed near the bus stop"),
        ("Ambulance needed, chest pain", "Garbage not collected for days"),
    ]

    duplicate_scores = [sim(a, b) for a, b in duplicates]
    non_duplicate_scores = [sim(a, b) for a, b in non_duplicates]
    worst_non_duplicate = max(non_duplicate_scores)

    # Hard requirement: never merge unrelated reports. A false merge hides a real
    # emergency behind an unrelated one.
    assert worst_non_duplicate < DUPLICATE_SIMILARITY_THRESHOLD, (
        f"threshold {DUPLICATE_SIMILARITY_THRESHOLD} would merge an unrelated "
        f"pair scoring {worst_non_duplicate:.3f}"
    )

    # Soft requirement: still actually cluster. Not all four are expected to
    # clear it - the electric-wire pair is synonymous with no shared vocabulary
    # and scores ~0.41, which no safe threshold reaches.
    caught = sum(1 for score in duplicate_scores if score >= DUPLICATE_SIMILARITY_THRESHOLD)
    assert caught >= 3, (
        f"threshold {DUPLICATE_SIMILARITY_THRESHOLD} catches only {caught}/4 "
        f"duplicate pairs {[round(s, 3) for s in duplicate_scores]} - clustering "
        f"has become effectively inert"
    )


def test_fallback_embedding_is_flagged_non_semantic():
    """Without sentence-transformers the engine must admit the vector is not semantic."""
    result = embeddings_engine.generate_embedding("any text at all")
    if result.model == "sha256-fallback":
        assert result.is_semantic is False
    else:
        assert result.is_semantic is True
    assert len(result.vector) == 384

def test_priority_score_formula():
    high_priority = calculate_priority_score(severity=5, corroboration_count=8, time_in_queue_hours=2.0, category="fire")
    low_priority = calculate_priority_score(severity=1, corroboration_count=1, time_in_queue_hours=0.1, category="infrastructure_damage")
    assert high_priority > low_priority

def test_priority_queue_push_pop():
    queue = IncidentPriorityQueue()
    queue.push({"id": 1, "severity": 5, "corroboration_count": 8, "time_in_queue_hours": 2.0, "category": "fire"})
    queue.push({"id": 2, "severity": 1, "corroboration_count": 1, "time_in_queue_hours": 0.1, "category": "infrastructure_damage"})
    assert queue.pop()["id"] == 1
    assert queue.pop()["id"] == 2
    with pytest.raises(IndexError):
        queue.pop()

def test_priority_queue_empty_pop_raises():
    queue = IncidentPriorityQueue()
    with pytest.raises(IndexError):
        queue.pop()

def test_kd_tree_responder_matching():
    responders = [
        {"id": 1, "name": "Unit A", "latitude": 19.0100, "longitude": 72.8400},
        {"id": 2, "name": "Unit B", "latitude": 19.0760, "longitude": 72.8777},
        {"id": 3, "name": "Unit C", "latitude": 18.9400, "longitude": 72.8200},
    ]
    tree = KDTree(responders)
    nearest = tree.find_nearest(19.0759, 72.8776)
    assert nearest["id"] == 2


def _brute_force_sorted(points, lat, lon):
    return sorted(points, key=lambda p: haversine_distance(p["latitude"], p["longitude"], lat, lon))


def test_kd_tree_matches_brute_force_at_high_latitude():
    """
    A degree of longitude shrinks by cos(latitude), so a pruning test that treats
    both axes as 111 km/degree over-prunes and can discard the true nearest
    responder. Invisible near the equator, real further north - so the test has
    to run somewhere the bug actually bites.
    """
    random.seed(1337)
    for _ in range(200):
        points = [
            {"id": i, "latitude": 55.0 + random.uniform(-0.3, 0.3), "longitude": random.uniform(-0.5, 0.5)}
            for i in range(40)
        ]
        lat = 55.0 + random.uniform(-0.3, 0.3)
        lon = random.uniform(-0.5, 0.5)
        expected = _brute_force_sorted(points, lat, lon)[0]["id"]
        assert KDTree(points).find_nearest(lat, lon)["id"] == expected


def test_kd_tree_find_k_nearest_matches_sorted_brute_force():
    random.seed(7)
    for _ in range(200):
        points = [
            {"id": i, "latitude": 19.0 + random.uniform(-0.3, 0.3), "longitude": 72.8 + random.uniform(-0.5, 0.5)}
            for i in range(30)
        ]
        lat = 19.0 + random.uniform(-0.3, 0.3)
        lon = 72.8 + random.uniform(-0.5, 0.5)
        expected = [p["id"] for p in _brute_force_sorted(points, lat, lon)[:5]]
        actual = [data["id"] for _, data in KDTree(points).find_k_nearest(lat, lon, 5)]
        assert actual == expected


def test_kd_tree_k_nearest_returns_ascending_distances():
    points = [
        {"id": 1, "latitude": 19.0100, "longitude": 72.8400},
        {"id": 2, "latitude": 19.0760, "longitude": 72.8777},
        {"id": 3, "latitude": 18.9400, "longitude": 72.8200},
    ]
    results = KDTree(points).find_k_nearest(19.0759, 72.8776, k=3)
    distances = [d for d, _ in results]
    assert distances == sorted(distances)
    assert results[0][1]["id"] == 2


def test_kd_tree_k_larger_than_population():
    points = [{"id": 1, "latitude": 19.0, "longitude": 72.8}]
    assert len(KDTree(points).find_k_nearest(19.0, 72.8, k=5)) == 1
