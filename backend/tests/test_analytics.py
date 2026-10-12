import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_heatmap_endpoint(client: AsyncClient):
    # 1. Create Incident
    payload = {
        "category": "flooding",
        "description": "Subway flooding at Station 4.",
        "latitude": "13.0760",
        "longitude": "80.2777"
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

    for key in ("total_incidents", "open_incidents", "category_counts",
                "severity_counts", "status_counts", "responder_counts",
                "total_responders", "clusters"):
        assert key in data, f"missing {key}"


@pytest.mark.asyncio
async def test_analytics_summary_reports_no_fabricated_fields(client: AsyncClient):
    """
    These fields were previously returned as fixed constants (45 units, 32
    deployed, 18.4 min average response) regardless of the data. Assert they stay
    gone so the fabrication cannot quietly return.
    """
    response = await client.get("/api/v1/incidents/analytics/summary")
    data = response.json()
    for fabricated in ("active_units", "deployed_units", "available_units",
                       "out_of_service_units", "avg_response_time_minutes"):
        assert fabricated not in data, f"{fabricated} is fabricated and must not be served"


@pytest.mark.asyncio
async def test_analytics_counts_reflect_real_incidents(client: AsyncClient):
    """An empty database must report zeros, not plausible-looking numbers."""
    empty = (await client.get("/api/v1/incidents/analytics/summary")).json()
    assert empty["total_incidents"] == 0
    assert empty["severity_counts"] == {"critical": 0, "major": 0, "minor": 0}
    assert empty["clusters"] == {"count": 0, "merged_reports": 0}

    for category in ("fire", "fire", "flooding"):
        await client.post("/api/v1/incidents/", data={
            "category": category,
            "description": f"Test {category} incident.",
            "latitude": "13.0760",
            "longitude": "80.2777",
        })

    data = (await client.get("/api/v1/incidents/analytics/summary")).json()
    assert data["total_incidents"] == 3
    assert data["category_counts"] == {"fire": 2, "flooding": 1}
    # Incidents are created at severity 2 before AI triage runs.
    assert data["severity_counts"]["minor"] == 3
    assert data["open_incidents"] == 3


@pytest.mark.asyncio
async def test_responder_counts_reflect_db(client: AsyncClient, db: AsyncSession):
    from backend.app.models.user import User, UserRole, Responder, ResponderStatus

    statuses = [ResponderStatus.AVAILABLE, ResponderStatus.AVAILABLE, ResponderStatus.BUSY, ResponderStatus.OFFLINE]
    for i, st in enumerate(statuses):
        user = User(name=f"Officer {i}", email=f"officer{i}@sentinel.gov",
                    password_hash="x", role=UserRole.RESPONDER)
        db.add(user)
        await db.flush()
        db.add(Responder(user_id=user.id, status=st, latitude=19.0 + i * 0.01,
                         longitude=72.8 + i * 0.01, department="Test Unit"))
    await db.commit()

    data = (await client.get("/api/v1/incidents/analytics/summary")).json()
    assert data["responder_counts"] == {"available": 2, "busy": 1, "offline": 1}
    assert data["total_responders"] == 4


@pytest.mark.asyncio
async def test_response_time_kpi_comes_from_transition_timestamps(client: AsyncClient, db: AsyncSession):
    """
    dispatched_at / resolved_at are stamped on the first transition into those
    states and never moved by later edits, and the summary averages only over
    incidents that actually reached them - with the sample size alongside.
    """
    from datetime import datetime, timedelta
    from sqlalchemy import update
    from backend.app.models.incident import Incident

    empty = (await client.get("/api/v1/incidents/analytics/summary")).json()["response_time"]
    assert empty == {"avg_dispatch_minutes": None, "dispatch_sample": 0,
                     "avg_resolve_minutes": None, "resolve_sample": 0}

    res = await client.post("/api/v1/incidents/", data={
        "category": "fire", "description": "Shop on fire", "latitude": 19.0, "longitude": 72.8,
    })
    incident_id = res.json()["id"]
    # Backdate creation so the interval is measurable and deterministic. A Core
    # update keeps the ORM identity map out of it (the endpoint shares this
    # session and eager-loads media_attachments itself).
    await db.execute(update(Incident).where(Incident.id == incident_id)
                     .values(created_at=datetime.utcnow() - timedelta(minutes=30)))
    await db.commit()
    db.expire_all()

    r = await client.patch(f"/api/v1/incidents/{incident_id}/status", json={"status": "dispatched"})
    first_dispatch = r.json()["dispatched_at"]
    assert first_dispatch is not None and r.json()["resolved_at"] is None

    # Bouncing through in_progress and back must not move the first stamp.
    await client.patch(f"/api/v1/incidents/{incident_id}/status", json={"status": "in_progress"})
    r = await client.patch(f"/api/v1/incidents/{incident_id}/status", json={"status": "dispatched"})
    assert r.json()["dispatched_at"] == first_dispatch

    r = await client.patch(f"/api/v1/incidents/{incident_id}/status", json={"status": "resolved"})
    assert r.json()["resolved_at"] is not None

    kpi = (await client.get("/api/v1/incidents/analytics/summary")).json()["response_time"]
    assert kpi["dispatch_sample"] == 1 and kpi["resolve_sample"] == 1
    assert 29.5 <= kpi["avg_dispatch_minutes"] <= 31
    assert 29.5 <= kpi["avg_resolve_minutes"] <= 31
