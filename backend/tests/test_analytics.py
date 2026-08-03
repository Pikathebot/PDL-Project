import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_heatmap_endpoint(client: AsyncClient):
    # 1. Create Incident
    payload = {
        "category": "flooding",
        "description": "Subway flooding at Station 4.",
        "latitude": "19.0760",
        "longitude": "72.8777"
    }
    await client.post("/api/v1/incidents/", data=payload)

    # 2. Get Heatmap Data
    response = await client.get("/api/v1/incidents/analytics/heatmap")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "latitude" in data[0]
    assert "intensity" in data[0]

@pytest.mark.asyncio
async def test_analytics_summary_endpoint(client: AsyncClient):
    response = await client.get("/api/v1/incidents/analytics/summary")
    assert response.status_code == 200
    data = response.json()
    assert "total_incidents" in data
    assert "active_units" in data
    assert "avg_response_time_minutes" in data
    assert "category_counts" in data
