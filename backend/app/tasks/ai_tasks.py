import asyncio
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.tasks.celery_app import celery_app
from backend.app.core.db import SessionLocal
from backend.app.models.incident import Incident, IncidentStatus
from ai_pipeline.vision.detector import yolo_detector
from ai_pipeline.nlp.extractor import llm_extractor
from ai_pipeline.nlp.embeddings import embeddings_engine

@celery_app.task(name="backend.app.tasks.ai_tasks.process_incident_ai")
def process_incident_ai(incident_id: int):
    """
    Celery background worker task for async AI analysis.
    Executes YOLOv8 detection, LLM field extraction, and embedding generation.
    """
    asyncio.run(_async_process(incident_id))

async def _async_process(incident_id: int, session: AsyncSession = None):
    if session:
        await _process_incident(incident_id, session)
    else:
        async with SessionLocal() as db_session:
            await _process_incident(incident_id, db_session)

async def _process_incident(incident_id: int, session: AsyncSession):
    res = await session.execute(
        select(Incident)
        .options(selectinload(Incident.media_attachments))
        .where(Incident.id == incident_id)
    )
    incident = res.scalar_one_or_none()
    if not incident:
        return

    incident.status = IncidentStatus.AI_PROCESSING
    await session.commit()

    # 1. Vision Detection (if media present)
    detector_res = {}
    if incident.media_attachments:
        media_path = incident.media_attachments[0].file_path
        detector_res = yolo_detector.detect(media_path)
        incident.ai_classification = detector_res.get("hazard_label", "Hazard")
        incident.ai_confidence = detector_res.get("highest_confidence", 0.8)
        incident.severity = detector_res.get("estimated_severity", incident.severity)

    # 2. LLM Extraction
    extracted_details = await llm_extractor.extract_details(incident.description)
    incident.structured_details = extracted_details

    # 3. Vector Embedding
    vec = embeddings_engine.generate_embedding(incident.description)
    incident.embedding_json = {"vector": vec}

    # Update status to VERIFIED
    incident.status = IncidentStatus.VERIFIED
    await session.commit()

