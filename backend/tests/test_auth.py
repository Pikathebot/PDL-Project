import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_login_returns_token_and_me_works(anon_client: AsyncClient, dispatcher):
    bad = await anon_client.post("/api/v1/auth/login", json={"email": dispatcher.email, "password": "wrong"})
    assert bad.status_code == 401

    ok = await anon_client.post("/api/v1/auth/login", json={"email": dispatcher.email, "password": "dispatch123"})
    assert ok.status_code == 200
    body = ok.json()
    assert body["token_type"] == "bearer"
    assert body["user"] == {"id": dispatcher.id, "name": "Test Dispatcher",
                            "email": dispatcher.email, "role": "dispatcher"}

    me = await anon_client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.status_code == 200 and me.json()["email"] == dispatcher.email


@pytest.mark.asyncio
async def test_citizen_endpoints_stay_public_and_dispatcher_ones_are_guarded(anon_client: AsyncClient):
    created = await anon_client.post("/api/v1/incidents/", data={
        "category": "fire", "description": "Shop on fire", "latitude": 19.0, "longitude": 72.8,
    })
    assert created.status_code == 201
    tracking_id, incident_id = created.json()["tracking_id"], created.json()["id"]
    assert (await anon_client.get(f"/api/v1/incidents/track/{tracking_id}")).status_code == 200

    guarded = [
        ("GET", "/api/v1/incidents/", None),
        ("GET", f"/api/v1/incidents/{incident_id}", None),
        ("PATCH", f"/api/v1/incidents/{incident_id}/status", {"status": "dispatched"}),
        ("GET", f"/api/v1/incidents/{incident_id}/nearest-responders", None),
        ("POST", f"/api/v1/incidents/{incident_id}/dispatch", {"responder_id": 1}),
        ("GET", "/api/v1/incidents/analytics/summary", None),
        ("GET", "/api/v1/incidents/analytics/heatmap", None),
    ]
    for method, url, body in guarded:
        res = await anon_client.request(method, url, json=body)
        assert res.status_code == 401, f"{method} {url} should require auth, got {res.status_code}"

    garbage = await anon_client.get("/api/v1/incidents/", headers={"Authorization": "Bearer not.a.jwt"})
    assert garbage.status_code == 401


@pytest.mark.asyncio
async def test_responder_role_cannot_use_dispatcher_endpoints(anon_client: AsyncClient, db):
    from backend.app.core.auth import create_access_token, hash_password
    from backend.app.models.user import User, UserRole
    user = User(name="Field Officer", email="officer@test.local",
                password_hash=hash_password("x"), role=UserRole.RESPONDER)
    db.add(user)
    await db.commit()
    await db.refresh(user)

    res = await anon_client.get("/api/v1/incidents/", headers={"Authorization": f"Bearer {create_access_token(user)}"})
    assert res.status_code == 403


def test_websocket_accepts_dispatcher_jwt_and_static_token_only():
    from backend.app.core.auth import create_access_token
    from backend.app.core.config import settings
    from backend.app.core.websocket_manager import ws_manager
    from backend.app.models.user import User, UserRole

    dispatcher = User(id=1, name="d", email="d@x", password_hash="", role=UserRole.DISPATCHER)
    responder = User(id=2, name="r", email="r@x", password_hash="", role=UserRole.RESPONDER)
    assert ws_manager._validate_token(create_access_token(dispatcher))
    assert ws_manager._validate_token(settings.WS_ACCESS_TOKEN)
    assert not ws_manager._validate_token(create_access_token(responder))
    assert not ws_manager._validate_token("nope")
    assert not ws_manager._validate_token(None)
