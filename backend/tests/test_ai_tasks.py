import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.incident import Incident, IncidentCategory, IncidentStatus
from backend.app.tasks.ai_tasks import _async_process

@pytest.mark.asyncio
async def test_async_process_incident_ai(db: AsyncSession):
    # 1. Create a raw reported incident in test DB
    incident = Incident(
        tracking_id="INC-TEST-12345",
        category=IncidentCategory.INFRASTRUCTURE_DAMAGE,
        description="Pothole causing heavy traffic delay on western express highway.",
        latitude=19.1197,
        longitude=72.8464,
        location_name="Western Express Highway",
        phone_number="+919876543210",
        status=IncidentStatus.REPORTED,
        priority_score=40
    )
    db.add(incident)
    await db.commit()
    await db.refresh(incident)

    incident_id = incident.id
    assert incident.status == IncidentStatus.REPORTED

    # 2. Execute AI processing workflow
    await _async_process(incident_id, session=db)

    # 3. Verify status updated to VERIFIED and AI fields populated
    await db.refresh(incident)
    assert incident.status == IncidentStatus.VERIFIED
    assert incident.structured_details is not None
    assert incident.embedding_json is not None
    assert "vector" in incident.embedding_json
