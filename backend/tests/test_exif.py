import os
import pytest
from PIL import Image
from ai_pipeline.vision.exif import exif_verifier

def test_exif_verifier_no_exif(tmp_path):
    # Create a plain image without EXIF metadata
    img_path = str(tmp_path / "test_plain.jpg")
    img = Image.new("RGB", (100, 100), color="red")
    img.save(img_path)

    result = exif_verifier.verify_image_exif(img_path, submitted_lat=19.0760, submitted_lon=72.8777)
    assert result["has_exif"] is False
    assert result["status"] == "NO_EXIF"
    assert result["is_valid"] is True

def test_exif_verifier_distance_calculation():
    # Distance between BKC (19.0760, 72.8777) and Nariman Point (18.9220, 72.8230) ~ 18km
    dist = exif_verifier._calculate_haversine_distance(19.0760, 72.8777, 18.9220, 72.8230)
    assert dist > 15000.0  # > 15 km
