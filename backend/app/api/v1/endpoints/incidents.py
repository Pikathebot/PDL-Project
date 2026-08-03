import uuid
import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from backend.app.core.db import get_db
from backend.app.models.incident import Incident, IncidentCategory, IncidentStatus
from backend.app.models.media import MediaAttachment, MediaType, ValidationStatus
from backend.app.schemas.incident import IncidentRead, IncidentUpdateStatus
from backend.app.services.storage import storage_service
from backend.app.tasks.ai_tasks import process_incident_ai

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/", response_model=IncidentRead, status_code=status.HTTP_201_CREATED)
async def create_incident(
    category: IncidentCategory = Form(...),
    description: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    location_name: Optional[str] = Form(None),
    phone_number: Optional[str] = Form(None),
    files: List[UploadFile] = File(default=[]),
    db: AsyncSession = Depends(get_db)
):
    tracking_id = f"INC-{uuid.uuid4().hex[:8].upper()}"

    incident = Incident(
        tracking_id=tracking_id,
        category=category,
        description=description,
        latitude=latitude,
        longitude=longitude,
        location_name=location_name,
        phone_number=phone_number,
        severity=2,  # Default baseline prior to AI processing
        priority_score=50.0,
        status=IncidentStatus.REPORTED
    )
    db.add(incident)
    await db.flush()

    for upload_file in files:
        if upload_file.filename:
            file_url, file_size = await storage_service.save_file(upload_file)
            mtype = MediaType.IMAGE
            if upload_file.content_type and "video" in upload_file.content_type:
                mtype = MediaType.VIDEO
            elif upload_file.content_type and "audio" in upload_file.content_type:
                mtype = MediaType.AUDIO

            media_attachment = MediaAttachment(
                incident_id=incident.id,
                file_path=file_url,
                media_type=mtype,
                file_size_bytes=file_size,
                validation_status=ValidationStatus.PENDING
            )
            db.add(media_attachment)

    await db.commit()

    # Fire-and-forget AI processing (vision, extraction, embeddings).
    # If the broker is down, the report is still saved and can be retried later.
    try:
        process_incident_ai.delay(incident.id)
    except Exception:
        logger.exception("Failed to enqueue AI processing for incident %s", incident.id)

    # Re-fetch with media attachments loaded
    res = await db.execute(
        select(Incident)
        .options(selectinload(Incident.media_attachments))
        .where(Incident.id == incident.id)
    )
    return res.scalar_one()

@router.get("/", response_model=List[IncidentRead])
async def list_incidents(
    category: Optional[IncidentCategory] = None,
    status: Optional[IncidentStatus] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db)
):
    query = select(Incident).options(selectinload(Incident.media_attachments)).order_by(desc(Incident.priority_score))

    if category:
        query = query.where(Incident.category == category)
    if status:
        query = query.where(Incident.status == status)

    query = query.offset(offset).limit(limit)
    res = await db.execute(query)
    return res.scalars().all()

@router.get("/{incident_id}", response_model=IncidentRead)
async def get_incident(incident_id: int, db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(Incident)
        .options(selectinload(Incident.media_attachments))
        .where(Incident.id == incident_id)
    )
    incident = res.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident

@router.patch("/{incident_id}/status", response_model=IncidentRead)
async def update_incident_status(
    incident_id: int,
    update_data: IncidentUpdateStatus,
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Incident)
        .options(selectinload(Incident.media_attachments))
        .where(Incident.id == incident_id)
    )
    incident = res.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    incident.status = update_data.status
    if update_data.assigned_responder_id is not None:
        incident.assigned_responder_id = update_data.assigned_responder_id

    await db.commit()
    await db.refresh(incident)
    return incident
