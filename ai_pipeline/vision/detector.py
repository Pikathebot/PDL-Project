import os
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

# Detections at or above this are trusted enough to put into words. Below it
# (a 0.35 "car" that was a scooter at the edge of the frame) they still count
# for severity, but an AI-written description must not state them as fact.
DESCRIBE_MIN_CONFIDENCE = 0.5

class YOLOv8Detector:
    """
    YOLOv8 Object Detection and Hazard Severity Estimator.
    """

    def __init__(self, model_name: str = "yolov8n.pt"):
        self.model_name = model_name
        self.model = None

    def _load_model(self):
        if self.model is None:
            try:
                from ultralytics import YOLO
                self.model = YOLO(self.model_name)
            except Exception as e:
                logger.warning(f"Failed to load YOLOv8 model: {e}")
                self.model = None

    def detect(self, image_path: str) -> Dict[str, Any]:
        self._load_model()
        if self.model is None or not os.path.exists(image_path):
            # No model or no readable image. Report that plainly instead of
            # emitting a severity and confidence the caller cannot distinguish
            # from a real detection.
            logger.warning("Vision model unavailable - no detection performed for %s", image_path)
            return {
                "model_available": False,
                "detected_objects": [],
                "confident_objects": [],
                "highest_confidence": None,
                "estimated_severity": None,
                "hazard_label": None,
            }

        results = self.model(image_path)
        detected_objects = []
        confident_objects = set()
        max_conf = 0.0

        for r in results:
            for box in r.boxes:
                label = self.model.names[int(box.cls[0])]
                conf = float(box.conf[0])
                detected_objects.append(label)
                if conf >= DESCRIBE_MIN_CONFIDENCE:
                    confident_objects.add(label)
                if conf > max_conf:
                    max_conf = conf

        severity = 2
        if any(w in detected_objects for w in ["fire", "smoke", "truck", "bus"]):
            severity = 4
        elif any(w in detected_objects for w in ["car", "motorcycle", "person"]):
            severity = 3

        return {
            "model_available": True,
            "detected_objects": list(set(detected_objects)),
            "confident_objects": sorted(confident_objects),
            "highest_confidence": round(max_conf, 2),
            "estimated_severity": severity,
            "hazard_label": detected_objects[0] if detected_objects else "Unknown",
        }

yolo_detector = YOLOv8Detector()