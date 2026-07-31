import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_incident_endpoint(client: AsyncClient):
    payload = {
        "category": "road_accident",
        "description": "Minor vehicle collision at junction.",
        "latitude": "19.0760",
        "longitude": "72.8777",
        "location_name": "Bandra Kurla Complex",
        "phone_number": "+919876543210"
    }
    response = await client.post("/api/v1/incidents/", data=payload)
    assert response.status_code == 201
    data = response.json()
    assert "tracking_id" in data
    assert data["category"] == "road_accident"
    assert data["status"] == "reported"

@pytest.mark.asyncio
async def test_list_incidents_endpoint(client: AsyncClient):
    response = await client.get("/api/v1/incidents/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
