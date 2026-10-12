from PIL import Image
from ai_pipeline.vision.exif import exif_verifier

def test_exif_verifier_no_exif(tmp_path):
    # Create a plain image without EXIF metadata
    img_path = str(tmp_path / "test_plain.jpg")
    img = Image.new("RGB", (100, 100), color="red")
    img.save(img_path)

    result = exif_verifier.verify_image_exif(img_path, submitted_lat=13.0760, submitted_lon=80.2777)
    assert result["has_exif"] is False
    assert result["status"] == "NO_EXIF"
    assert result["is_valid"] is True

def test_exif_verifier_distance_calculation():
    # Distance between Chennai Central (13.0827, 80.2757) and Tambaram (12.9249, 80.1000) ~ 26km
    dist = exif_verifier._calculate_haversine_distance(13.0827, 80.2757, 12.9249, 80.1000)
    assert dist > 15000.0  # > 15 km
