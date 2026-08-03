import math
import logging
from typing import Dict, Any, Optional, Tuple
from PIL import Image, ExifTags

logger = logging.getLogger(__name__)

class EXIFVerifier:
    """
    Parses image EXIF metadata (GPSInfo & Timestamp) and verifies spatial drift against submitted location.
    """
    def __init__(self, max_drift_meters: float = 500.0):
        self.max_drift_meters = max_drift_meters

    def _convert_to_degrees(self, value) -> float:
        """Helper to convert EXIF tuple coordinates (deg, min, sec) to decimal degrees."""
        try:
            d = float(value[0])
            m = float(value[1])
            s = float(value[2])
            return d + (m / 60.0) + (s / 3600.0)
        except Exception:
            return 0.0

    def _extract_gps(self, exif_dict: dict) -> Optional[Tuple[float, float]]:
        gps_info = exif_dict.get(34853)  # 34853 is EXIF GPSInfo tag
        if not gps_info:
            return None

        try:
            lat_data = gps_info.get(2)  # GPSLatitude
            lat_ref = gps_info.get(1)   # GPSLatitudeRef ('N' or 'S')
            lon_data = gps_info.get(4)  # GPSLongitude
            lon_ref = gps_info.get(3)   # GPSLongitudeRef ('E' or 'W')

            if not lat_data or not lon_data:
                return None

            lat = self._convert_to_degrees(lat_data)
            if lat_ref == 'S':
                lat = -lat

            lon = self._convert_to_degrees(lon_data)
            if lon_ref == 'W':
                lon = -lon

            return (lat, lon)
        except Exception as e:
            logger.warning(f"Error parsing EXIF GPSInfo: {e}")
            return None

    def _calculate_haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculates distance between two coordinates in meters."""
        r = 6371000.0  # Earth radius in meters
        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)

        a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return r * c

    def verify_image_exif(self, image_path: str, submitted_lat: float, submitted_lon: float) -> Dict[str, Any]:
        try:
            with Image.open(image_path) as img:
                exif = img._getexif()
                if not exif:
                    return {
                        "has_exif": False,
                        "status": "NO_EXIF",
                        "is_valid": True,
                        "drift_meters": None,
                        "exif_lat": None,
                        "exif_lon": None
                    }

                gps_coords = self._extract_gps(exif)
                if not gps_coords:
                    return {
                        "has_exif": False,
                        "status": "NO_EXIF",
                        "is_valid": True,
                        "drift_meters": None,
                        "exif_lat": None,
                        "exif_lon": None
                    }

                exif_lat, exif_lon = gps_coords
                drift_meters = self._calculate_haversine_distance(submitted_lat, submitted_lon, exif_lat, exif_lon)
                is_valid = drift_meters <= self.max_drift_meters

                return {
                    "has_exif": True,
                    "status": "VERIFIED" if is_valid else "LOCATION_MISMATCH",
                    "is_valid": is_valid,
                    "drift_meters": round(drift_meters, 2),
                    "exif_lat": round(exif_lat, 6),
                    "exif_lon": round(exif_lon, 6)
                }
        except Exception as e:
            logger.warning(f"Failed to process EXIF for image {image_path}: {e}")
            return {
                "has_exif": False,
                "status": "NO_EXIF",
                "is_valid": True,
                "drift_meters": None,
                "exif_lat": None,
                "exif_lon": None
            }

exif_verifier = EXIFVerifier()
