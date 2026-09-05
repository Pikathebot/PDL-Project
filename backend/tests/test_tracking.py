import pytest
from httpx import AsyncClient


async def _create(client: AsyncClient, description: str = "Live wire down on the footpath.") -> dict:
    response = await client.post(
        "/api/v1/incidents/",
        data={
            "category": "electrical_hazard",
            "description": description,
            "latitude": "19.0760",
            "longitude": "72.8777",
            "phone_number": "+919812345678",
        },
    )
    assert response.status_code == 201
    return response.json()


@pytest.mark.asyncio
async def test_track_returns_the_matching_incident(client: AsyncClient):
    created = await _create(client)

    response = await client.get(f"/api/v1/incidents/track/{created['tracking_id']}")
    assert response.status_code == 200

    body = response.json()
    assert body["tracking_id"] == created["tracking_id"]
    assert body["category"] == "electrical_hazard"
    assert body["status"]


@pytest.mark.asyncio
async def test_track_is_case_insensitive_and_trims(client: AsyncClient):
    created = await _create(client)
    tid = created["tracking_id"]

    response = await client.get(f"/api/v1/incidents/track/{tid.lower()}")
    assert response.status_code == 200
    assert response.json()["tracking_id"] == tid


@pytest.mark.asyncio
async def test_track_does_not_leak_the_reporter_phone_number(client: AsyncClient):
    """
    The tracking endpoint is unauthenticated, so anyone holding (or guessing) a
    tracking ID can call it. It must not hand back the reporter's phone number
    the way the dispatcher-facing IncidentRead does.
    """
    created = await _create(client)

    body = (await client.get(f"/api/v1/incidents/track/{created['tracking_id']}")).json()
    assert "phone_number" not in body
    assert "+919812345678" not in str(body)
    # Dispatcher-only ranking fields have no business in a citizen view either.
    assert "priority_score" not in body
    assert "assigned_responder_id" not in body


@pytest.mark.asyncio
async def test_track_unknown_id_returns_404(client: AsyncClient):
    response = await client.get("/api/v1/incidents/track/INC-DOESNOTEXIST")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_track_finds_incidents_outside_the_default_list_page(client: AsyncClient):
    """
    The regression this endpoint exists to kill: the frontend used to download
    GET /incidents (default limit 50, ordered by priority) and scan it in the
    browser, so a valid tracking ID for the 51st-ranked report came back as
    "no incident found".
    """
    created = [await _create(client, f"Hazard report number {i}.") for i in range(55)]

    listed = (await client.get("/api/v1/incidents/")).json()
    assert len(listed) == 50, "list endpoint should still be paging - otherwise this test proves nothing"

    listed_ids = {row["tracking_id"] for row in listed}
    missing = [c for c in created if c["tracking_id"] not in listed_ids]
    assert missing, "expected at least one report to fall outside the first page"

    # The old client-side scan would have returned nothing for these.
    for incident in missing:
        response = await client.get(f"/api/v1/incidents/track/{incident['tracking_id']}")
        assert response.status_code == 200
        assert response.json()["tracking_id"] == incident["tracking_id"]
