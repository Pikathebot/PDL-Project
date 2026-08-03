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

@pytest.mark.asyncio
async def test_nearest_responders_and_dispatch(client: AsyncClient, db):
    from backend.app.models.user import User, UserRole, Responder, ResponderStatus
    # Create test user & responder
    user = User(
        name="Officer Rajesh Kumar",
        email="rajesh@sentinel.gov.in",
        password_hash="hashed_pw",
        role=UserRole.RESPONDER
    )
    db.add(user)
    await db.flush()

    responder = Responder(
        user_id=user.id,
        department="Police Traffic Branch",
        status=ResponderStatus.AVAILABLE,
        latitude=19.0770,
        longitude=72.8780
    )
    db.add(responder)
    await db.commit()

    # 1. Create Incident
    payload = {
        "category": "road_accident",
        "description": "Collision near BKC.",
        "latitude": "19.0760",
        "longitude": "72.8777"
    }
    create_res = await client.post("/api/v1/incidents/", data=payload)
    inc_data = create_res.json()
    inc_id = inc_data["id"]

    # 2. Get Nearest Responders
    near_res = await client.get(f"/api/v1/incidents/{inc_id}/nearest-responders")
    assert near_res.status_code == 200
    responders_list = near_res.json()
    assert len(responders_list) == 1
    assert responders_list[0]["name"] == "Officer Rajesh Kumar"
    assert responders_list[0]["distance_km"] < 1.0

    # 3. Dispatch Responder
    dispatch_payload = {"responder_id": responder.id}
    disp_res = await client.post(f"/api/v1/incidents/{inc_id}/dispatch", json=dispatch_payload)
    assert disp_res.status_code == 200
    disp_data = disp_res.json()
    assert disp_data["status"] == "dispatched"
    assert disp_data["assigned_responder_id"] == responder.id

