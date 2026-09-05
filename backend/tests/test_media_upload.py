import io
import os
import pytest
from httpx import AsyncClient

from backend.app.services.storage import UPLOAD_DIR

@pytest.mark.asyncio
async def test_incident_media_upload_and_static_serving(client: AsyncClient):
    # Prepare dummy image binary payload
    fake_image_bytes = b"\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x01\x00\x60\x00\x60\x00\x00\xFF\xDB"
    
    data = {
        "category": "fire",
        "description": "Building fire reported with thick smoke.",
        "latitude": "19.0760",
        "longitude": "72.8777",
        "location_name": "Andheri West",
        "phone_number": "+919876543210"
    }
    
    files = [
        ("files", ("fire_evidence.jpg", io.BytesIO(fake_image_bytes), "image/jpeg"))
    ]

    response = await client.post("/api/v1/incidents/", data=data, files=files)
    assert response.status_code == 201, f"Expected 201, got {response.status_code}: {response.text}"
    
    res_data = response.json()
    assert res_data["category"] == "fire"
    assert "media_attachments" in res_data
    assert len(res_data["media_attachments"]) == 1

    media = res_data["media_attachments"][0]
    assert media["file_path"].startswith("/media_uploads/")
    assert media["file_size_bytes"] == len(fake_image_bytes)

    # Test static file retrieval endpoint
    static_resp = await client.get(media["file_path"])
    assert static_resp.status_code == 200
    assert static_resp.content == fake_image_bytes

    # Every run used to leave a permanent 22-byte stub in the repo's own
    # media_uploads/ directory - that is how 11 of them ended up committed.
    written = os.path.join(UPLOAD_DIR, os.path.basename(media["file_path"]))
    if os.path.exists(written):
        os.remove(written)
