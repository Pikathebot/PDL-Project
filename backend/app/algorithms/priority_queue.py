import heapq
from typing import Dict, List, Any

CATEGORY_WEIGHTS = {
    "fire": 10.0,
    "road_accident": 9.0,
    "electrical_hazard": 8.5,
    "medical_emergency": 8.5,
    "environmental_hazard": 7.5,
    "infrastructure_damage": 6.0,
    "flooding": 6.0,
    "criminal_activity": 8.0,
}

def calculate_priority_score(severity: int, corroboration_count: int, time_in_queue_hours: float, category: str) -> float:
    """
    Weighted composite priority score formula:
    priority = severity(40%) + corroboration_count(30%) + time_in_queue(20%) + category_weight(10%)
    """
    norm_severity = (min(max(severity, 1), 5) / 5.0) * 100.0
    norm_corroboration = (min(corroboration_count, 10) / 10.0) * 100.0
    norm_time = (min(time_in_queue_hours, 24.0) / 24.0) * 100.0
    cat_weight = CATEGORY_WEIGHTS.get(category.lower(), 5.0) * 10.0

    score = (
        norm_severity * 0.40 +
        norm_corroboration * 0.30 +
        norm_time * 0.20 +
        cat_weight * 0.10
    )
    return round(score, 2)

class IncidentPriorityQueue:
    """
    Heap-based Priority Queue for maintaining dispatcher incident sorting.
    Stores tuples of (-priority_score, incident_id, incident_data).
    """
    def __init__(self):
        self._heap = []

    def push(self, incident: Dict[str, Any]):
        score = calculate_priority_score(
            severity=incident.get("severity", 1),
            corroboration_count=incident.get("corroboration_count", 1),
            time_in_queue_hours=incident.get("time_in_queue_hours", 0.0),
            category=incident.get("category", "infrastructure_damage")
        )
        # Store negative score for max-heap behavior via min-heap
        heapq.heappush(self._heap, (-score, incident["id"], incident))

    def pop(self) -> Dict[str, Any]:
        if not self._heap:
            raise IndexError("Pop from an empty priority queue")
        _, _, incident = heapq.heappop(self._heap)
        return incident

    def get_sorted_list(self) -> List[Dict[str, Any]]:
        return [item[2] for item in sorted(self._heap)]
