import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_incident_endpoint(client: AsyncClient):
    payload = {
        "category": "road_accident",
        "description": "Minor vehicle collision at junction.",
        "latitude": "13.0760",
        "longitude": "80.2777",
        "location_name": "Chennai Central",
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
        latitude=13.0770,
        longitude=80.2780
    )
    db.add(responder)
    await db.commit()

    # 1. Create Incident
    payload = {
        "category": "road_accident",
        "description": "Collision near BKC.",
        "latitude": "13.0760",
        "longitude": "80.2777"
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



@pytest.mark.asyncio
async def test_inline_mode_schedules_pipeline_as_background_task(client, monkeypatch):
    """
    AI_PROCESSING_MODE=inline must run _async_process in-process instead of
    enqueueing to Celery - that is what makes run.bat work without Redis.
    """
    from backend.app.api.v1.endpoints import incidents as endpoint
    from backend.app.tasks import ai_tasks

    monkeypatch.setattr(endpoint.settings, "AI_PROCESSING_MODE", "inline")
    processed = []

    async def fake_process(incident_id):
        processed.append(incident_id)
    monkeypatch.setattr(endpoint, "_async_process", fake_process)

    def boom(*a, **kw):
        raise AssertionError("Celery must not be used in inline mode")
    monkeypatch.setattr(ai_tasks.process_incident_ai, "delay", boom)

    res = await client.post("/api/v1/incidents/", data={
        "category": "fire", "description": "Smoke from a shop", "latitude": 19.0, "longitude": 72.8,
    })
    assert res.status_code == 201
    # BackgroundTasks run after the response inside the ASGI transport call.
    assert processed == [res.json()["id"]]


@pytest.mark.asyncio
async def test_blank_description_needs_media(client: AsyncClient):
    payload = {"category": "fire", "description": "   ", "latitude": "13.04", "longitude": "80.23"}
    response = await client.post("/api/v1/incidents/", data=payload)
    assert response.status_code == 422

    response = await client.post("/api/v1/incidents/", data=payload,
                                 files={"files": ("scene.jpg", b"\xff\xd8\xff\xd9", "image/jpeg")})
    assert response.status_code == 201
    assert response.json()["description"] == ""
