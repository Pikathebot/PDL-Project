import math
from typing import List, Optional, Tuple, Dict, Any

class KDNode:
    def __init__(self, point: Tuple[float, float], data: Dict[str, Any], axis: int):
        self.point = point  # (lat, lon)
        self.data = data
        self.axis = axis    # 0 for lat, 1 for lon
        self.left = None
        self.right = None

class KDTree:
    """
    2D k-d Tree for spatial nearest-neighbor search of available responders.
    """
    def __init__(self, points: List[Dict[str, Any]]):
        self.root = self._build_tree(points, depth=0)

    def _build_tree(self, points: List[Dict[str, Any]], depth: int) -> Optional[KDNode]:
        if not points:
            return None

        axis = depth % 2
        sorted_points = sorted(points, key=lambda p: (p["latitude"], p["longitude"])[axis])
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

    def find_nearest(self, target_lat: float, target_lon: float) -> Optional[Dict[str, Any]]:
        if not self.root:
            return None

        best_node = [None]
        best_dist = [float("inf")]

        def _search(node: Optional[KDNode]):
            if node is None:
                return

            # Euclidian distance approximation for lat/lon comparison
            dx = node.point[0] - target_lat
            dy = node.point[1] - target_lon
            dist = math.sqrt(dx * dx + dy * dy)

            if dist < best_dist[0]:
                best_dist[0] = dist
                best_node[0] = node

            axis = node.axis
            target_val = target_lat if axis == 0 else target_lon
            node_val = node.point[axis]

            first_child = node.left if target_val < node_val else node.right
            second_child = node.right if target_val < node_val else node.left

            _search(first_child)

            if abs(target_val - node_val) < best_dist[0]:
                _search(second_child)

        _search(self.root)
        return best_node[0].data if best_node[0] else None
