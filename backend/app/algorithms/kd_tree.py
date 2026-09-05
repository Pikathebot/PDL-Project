import heapq
import math
from typing import List, Optional, Tuple, Dict, Any

# Metres per degree of latitude. A degree of longitude covers this same distance
# scaled by cos(latitude), which is why the two axes cannot share one constant.
METERS_PER_DEGREE_LAT = 111320.0


class KDNode:
    def __init__(self, point: Tuple[float, float], data: Dict[str, Any], axis: int):
        self.point = point  # (lat, lon)
        self.data = data
        self.axis = axis    # 0 for lat, 1 for lon
        self.left = None
        self.right = None


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates distance between two lat/lon pairs in meters using Haversine formula."""
    R = 6371000  # Radius of Earth in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class KDTree:
    """
    2D k-d Tree for spatial nearest-neighbor search of available responders.
    Uses Haversine distance for geographic coordinates.
    """
    def __init__(self, points: List[Dict[str, Any]]):
        self.root = self._build_tree(points, depth=0)

    def _build_tree(self, points: List[Dict[str, Any]], depth: int) -> Optional[KDNode]:
        if not points:
            return None

        axis = depth % 2
        key_func = (lambda p: p["latitude"]) if axis == 0 else (lambda p: p["longitude"])
        sorted_points = sorted(points, key=key_func)
        median_idx = len(sorted_points) // 2
        median_point = sorted_points[median_idx]

        node = KDNode(
            point=(median_point["latitude"], median_point["longitude"]),
            data=median_point,
            axis=axis
        )
        node.left = self._build_tree(sorted_points[:median_idx], depth + 1)
        node.right = self._build_tree(sorted_points[median_idx + 1:], depth + 1)
        return node

    @staticmethod
    def _axis_gap_meters(axis: int, target_lat: float, target_val: float, node_lat: float, node_val: float) -> float:
        """
        Distance in metres from the target to this node's splitting plane.

        Longitude degrees shrink towards the poles, so the longitude axis needs a
        cos(latitude) factor. Using the *larger* absolute latitude yields the
        smaller cosine, and therefore a conservative under-estimate of the gap -
        which makes the search explore more branches, never fewer. Under-estimating
        is safe; over-estimating would prune the true nearest neighbour away.
        """
        degrees = abs(target_val - node_val)
        if axis == 0:
            return degrees * METERS_PER_DEGREE_LAT
        widest = max(abs(target_lat), abs(node_lat))
        return degrees * METERS_PER_DEGREE_LAT * math.cos(math.radians(widest))

    def find_k_nearest(self, target_lat: float, target_lon: float, k: int = 1) -> List[Tuple[float, Dict[str, Any]]]:
        """
        Return up to k nearest points as (distance_meters, data), nearest first.

        Maintains a bounded max-heap of the best k seen so far, keyed on negative
        distance so the worst candidate is always at the top and can be evicted
        in O(log k).
        """
        if not self.root or k <= 0:
            return []

        heap: List[Tuple[float, int, Dict[str, Any]]] = []
        counter = 0  # tie-breaker so dicts are never compared

        def _worst() -> float:
            return -heap[0][0] if heap else float("inf")

        def _search(node: Optional[KDNode]):
            nonlocal counter
            if node is None:
                return

            dist = haversine_distance(node.point[0], node.point[1], target_lat, target_lon)
            if len(heap) < k:
                heapq.heappush(heap, (-dist, counter, node.data))
                counter += 1
            elif dist < _worst():
                heapq.heapreplace(heap, (-dist, counter, node.data))
                counter += 1

            axis = node.axis
            target_val = target_lat if axis == 0 else target_lon
            node_val = node.point[axis]

            first_child = node.left if target_val < node_val else node.right
            second_child = node.right if target_val < node_val else node.left

            _search(first_child)

            # Only cross the splitting plane if something better could lie beyond it.
            gap = self._axis_gap_meters(axis, target_lat, target_val, node.point[0], node_val)
            if len(heap) < k or gap < _worst():
                _search(second_child)

        _search(self.root)
        return [(-neg_dist, data) for neg_dist, _, data in sorted(heap, reverse=True)]

    def find_nearest(self, target_lat: float, target_lon: float) -> Optional[Dict[str, Any]]:
        results = self.find_k_nearest(target_lat, target_lon, k=1)
        return results[0][1] if results else None
