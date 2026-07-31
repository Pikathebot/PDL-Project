from datetime import datetime, timedelta
from backend.app.algorithms.union_find import UnionFind, haversine_distance, cosine_similarity, evaluate_incident_duplication
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
    inc1 = {"latitude": 19.0760, "longitude": 72.8777, "created_at": now, "vector": [0.1, 0.2, 0.3]}
    inc2 = {"latitude": 19.0761, "longitude": 72.8778, "created_at": now + timedelta(minutes=5), "vector": [0.1, 0.2, 0.31]}
    assert evaluate_incident_duplication(inc1, inc2) is True

def test_priority_score_formula():
    high_priority = calculate_priority_score(severity=5, corroboration_count=8, time_in_queue_hours=2.0, category="fire")
    low_priority = calculate_priority_score(severity=1, corroboration_count=1, time_in_queue_hours=0.1, category="infrastructure_damage")
    assert high_priority > low_priority

def test_kd_tree_responder_matching():
    responders = [
        {"id": 1, "name": "Unit A", "latitude": 19.0100, "longitude": 72.8400},
        {"id": 2, "name": "Unit B", "latitude": 19.0760, "longitude": 72.8777},
        {"id": 3, "name": "Unit C", "latitude": 18.9400, "longitude": 72.8200},
    ]
    tree = KDTree(responders)
    nearest = tree.find_nearest(19.0759, 72.8776)
    assert nearest["id"] == 2
