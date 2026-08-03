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

import math
from backend.app.core.websocket_manager import ws_manager
from backend.app.models.user import Responder, ResponderStatus, User
from backend.app.schemas.user import ResponderRead, DispatchRequest
from backend.app.algorithms.kd_tree import KDTree

from backend.app.core.security import verify_turnstile_token

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/analytics/heatmap")
async def get_heatmap_data(db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(Incident.id, Incident.latitude, Incident.longitude, Incident.severity, Incident.priority_score, Incident.category)
        .where(Incident.status != IncidentStatus.CLOSED)
    )
    rows = res.all()

    heatmap_points = []
    for r in rows:
        intensity = min(1.0, max(0.1, r.priority_score / 100.0))
        heatmap_points.append({
            "id": r.id,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "severity": r.severity,
            "intensity": round(intensity, 2),
            "category": r.category.value if hasattr(r.category, "value") else str(r.category)
        })
    return heatmap_points

@router.get("/analytics/summary")
async def get_analytics_summary(db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Incident))
    incidents = res.scalars().all()

    cat_counts = {}
    sev_counts = {"critical": 0, "major": 0, "minor": 0}

    for inc in incidents:
        cat_key = inc.category.value if hasattr(inc.category, "value") else str(inc.category)
        cat_counts[cat_key] = cat_counts.get(cat_key, 0) + 1

        if inc.severity >= 4:
            sev_counts["critical"] += 1
        elif inc.severity == 3:
            sev_counts["major"] += 1
        else:
            sev_counts["minor"] += 1

    return {
        "total_incidents": len(incidents),
        "active_units": 45,
        "deployed_units": 32,
        "available_units": 9,
        "out_of_service_units": 4,
        "avg_response_time_minutes": 18.4,
        "category_counts": cat_counts,
        "severity_counts": sev_counts
    }

@router.post("/", response_model=IncidentRead, status_code=status.HTTP_201_CREATED)
async def create_incident(
    category: IncidentCategory = Form(...),
    description: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    location_name: Optional[str] = Form(None),
    phone_number: Optional[str] = Form(None),
    turnstile_token: Optional[str] = Form(None),
    files: List[UploadFile] = File(default=[]),
    db: AsyncSession = Depends(get_db)
):
    # Verify bot protection token
    is_valid_token = await verify_turnstile_token(turnstile_token)
    if not is_valid_token:
        raise HTTPException(status_code=403, detail="Anti-bot security verification failed.")

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
    created_incident = res.scalar_one()

    # Broadcast real-time WS notification
    await ws_manager.broadcast("incident_created", {
        "id": created_incident.id,
        "tracking_id": created_incident.tracking_id,
        "category": created_incident.category.value,
        "description": created_incident.description,
        "latitude": created_incident.latitude,
        "longitude": created_incident.longitude,
        "priority_score": created_incident.priority_score,
        "status": created_incident.status.value,
        "created_at": created_incident.created_at.isoformat()
    })

    return created_incident

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

    await ws_manager.broadcast("incident_status_updated", {
        "id": incident.id,
        "status": incident.status.value,
        "assigned_responder_id": incident.assigned_responder_id
    })

    return incident

@router.get("/{incident_id}/nearest-responders", response_model=List[ResponderRead])
async def get_nearest_responders(incident_id: int, limit: int = 5, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Incident).where(Incident.id == incident_id))
    incident = res.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    # Fetch available responders with user info
    resp_res = await db.execute(
        select(Responder)
        .options(selectinload(Responder.user))
        .where(Responder.status == ResponderStatus.AVAILABLE)
    )
    responders = resp_res.scalars().all()

    if not responders:
        return []

    # Format points for KDTree
    points = []
    for r in responders:
        if r.latitude is not None and r.longitude is not None:
            points.append({
                "responder_id": r.id,
                "user_id": r.user_id,
                "name": r.user.name if r.user else f"Responder #{r.id}",
                "department": r.department,
                "status": r.status,
                "latitude": r.latitude,
                "longitude": r.longitude,
                "last_active": r.last_active,
                "responder_obj": r
            })

    if not points:
        return []

    # Query using KDTree nearest neighbor
    kd = KDTree(points)
    nearest = kd.find_nearest(incident.latitude, incident.longitude)

    # Sort all points by approximate distance to target
    result_list = []
    for p in points:
        # Haversine distance in km
        lat1, lon1, lat2, lon2 = map(math.radians, [incident.latitude, incident.longitude, p["latitude"], p["longitude"]])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
        c = 2 * math.asin(math.sqrt(a))
        km = 6371 * c
        
        result_list.append(ResponderRead(
            id=p["responder_id"],
            user_id=p["user_id"],
            name=p["name"],
            department=p["department"],
            status=p["status"],
            latitude=p["latitude"],
            longitude=p["longitude"],
            distance_km=round(km, 2),
            last_active=p["last_active"]
        ))

    result_list.sort(key=lambda x: x.distance_km if x.distance_km is not None else 999999)
    return result_list[:limit]

@router.post("/{incident_id}/dispatch", response_model=IncidentRead)
async def dispatch_responder_to_incident(
    incident_id: int,
    dispatch_req: DispatchRequest,
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

    resp_res = await db.execute(select(Responder).where(Responder.id == dispatch_req.responder_id))
    responder = resp_res.scalar_one_or_none()
    if not responder:
        raise HTTPException(status_code=404, detail="Responder not found")

    # Update incident status & assignment
    incident.assigned_responder_id = responder.id
    incident.status = IncidentStatus.DISPATCHED

    # Update responder status
    responder.status = ResponderStatus.BUSY

    await db.commit()
    
    # Re-fetch incident with media attachments loaded for serialization
    res_final = await db.execute(
        select(Incident)
        .options(selectinload(Incident.media_attachments))
        .where(Incident.id == incident_id)
    )
    updated_incident = res_final.scalar_one()

    # Broadcast dispatch event
    await ws_manager.broadcast("dispatch_assigned", {
        "incident_id": updated_incident.id,
        "tracking_id": updated_incident.tracking_id,
        "responder_id": responder.id,
        "status": updated_incident.status.value
    })

    return updated_incident

