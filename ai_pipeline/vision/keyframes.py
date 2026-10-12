import logging
import os
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


def extract_keyframes(video_path: str, count: int = 3, out_dir: Optional[str] = None) -> List[str]:
    """
    Sample `count` evenly spaced frames from a video and write them as JPEGs
    next to it (or into out_dir). Returns the written paths, oldest first;
    empty if the file cannot be decoded.
    """
    try:
        import cv2
    except ImportError:
        logger.warning("OpenCV not installed - cannot sample video frames")
        return []

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        logger.warning("Could not open video %s", video_path)
        return []

    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    base, _ = os.path.splitext(os.path.basename(video_path))
    out_dir = out_dir or os.path.dirname(video_path)
    written: List[str] = []

    # Frame counts from container metadata can be off or zero (webm from
    # MediaRecorder often reports 0), so fall back to reading sequentially.
    if total > 0:
        positions = [int(total * (i + 1) / (count + 1)) for i in range(count)]
        for n, pos in enumerate(positions):
            cap.set(cv2.CAP_PROP_POS_FRAMES, pos)
            ok, frame = cap.read()
            if ok:
                path = os.path.join(out_dir, f"{base}_kf{n}.jpg")
                cv2.imwrite(path, frame)
                written.append(path)
    else:
        frames = []
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            frames.append(frame)
        if frames:
            step = max(1, len(frames) // (count + 1))
            for n, idx in enumerate(range(step, len(frames), step)[:count]):
                path = os.path.join(out_dir, f"{base}_kf{n}.jpg")
                cv2.imwrite(path, frames[idx])
                written.append(path)

    cap.release()
    return written


def analyse_video(video_path: str, detector, count: int = 3) -> Dict[str, Any]:
    """
    Run the image detector over sampled keyframes and merge the results:
    union of objects, highest confidence, worst severity. `best_frame` is the
    keyframe that produced the highest-confidence detection, for the UI.
    """
    if not os.path.exists(video_path):
        return {"model_available": False, "frames_sampled": 0, "reason": "video file not found"}

    frames = extract_keyframes(video_path, count=count)
    if not frames:
        return {"model_available": False, "frames_sampled": 0, "reason": "could not decode video"}

    per_frame = [detector.detect(f) for f in frames]
    if not any(r.get("model_available") for r in per_frame):
        return {"model_available": False, "frames_sampled": len(frames), "reason": "vision model unavailable"}

    objects = sorted({o for r in per_frame for o in r.get("detected_objects", [])})
    confident = sorted({o for r in per_frame for o in r.get("confident_objects", [])})
    best = max(per_frame, key=lambda r: r.get("highest_confidence") or 0.0)
    best_frame = frames[per_frame.index(best)]
    severities = [r["estimated_severity"] for r in per_frame if r.get("estimated_severity") is not None]

    return {
        "model_available": True,
        "frames_sampled": len(frames),
        "detected_objects": objects,
        "confident_objects": confident,
        "highest_confidence": best.get("highest_confidence"),
        "estimated_severity": max(severities) if severities else None,
        "hazard_label": best.get("hazard_label"),
        "best_frame": best_frame,
    }
