import asyncio
import uuid
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.tasks.celery_app import celery_app
from backend.app.core.db import SessionLocal
from backend.app.models.incident import Incident, IncidentStatus, IncidentCluster
from backend.app.models.media import MediaType, ValidationStatus
from backend.app.services.storage import storage_service
from backend.app.algorithms.union_find import UnionFind, evaluate_incident_duplication, haversine_distance
from ai_pipeline.vision.detector import yolo_detector
from ai_pipeline.nlp.extractor import llm_extractor
from ai_pipeline.nlp.embeddings import embeddings_engine
from ai_pipeline.nlp.transcriber import whisper_transcriber
from ai_pipeline.vision.exif import exif_verifier

@celery_app.task(name="backend.app.tasks.ai_tasks.process_incident_ai", bind=True, max_retries=3, default_retry_delay=60)
def process_incident_ai(self, incident_id: int):
    """
    Celery background worker task for async AI analysis.
    Executes YOLOv8 detection, LLM field extraction, and embedding generation.
    """
    try:
        asyncio.run(_async_process(incident_id))
    except Exception as exc:
        raise self.retry(exc=exc)

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

    # 1. Media analysis. Each attachment is routed by its declared type: feeding
    # every attachment to the image detector meant a voice-note-only report sent
    # a .webm to YOLOv8.
    provenance = {"vision": "unavailable", "exif": "unavailable", "transcription": "not_applicable"}
    transcripts = []
    vision_done = False

    for attachment in incident.media_attachments:
        # file_path is a URL; filesystem work needs the resolved path.
        media_path = storage_service.resolve_path(attachment.file_path)

        if attachment.media_type == MediaType.IMAGE:
            exif_result = exif_verifier.verify_image_exif(
                media_path, incident.latitude, incident.longitude
            )
            attachment.exif_data = exif_result
            attachment.validation_status = (
                ValidationStatus.VALID if exif_result.get("is_valid") else ValidationStatus.SUSPICIOUS
            )
            provenance["exif"] = "pillow"

            # Only the first image drives classification and severity.
            if not vision_done:
                vision_done = True
                detector_res = yolo_detector.detect(media_path)
                if detector_res.get("model_available"):
                    incident.ai_classification = detector_res.get("hazard_label")
                    incident.ai_confidence = detector_res.get("highest_confidence")
                    if detector_res.get("estimated_severity") is not None:
                        incident.severity = detector_res["estimated_severity"]
                    provenance["vision"] = "yolov8"
                else:
                    # Leave severity as reported. The mock has no opinion, and
                    # overwriting a real value with a placeholder is worse than
                    # leaving it alone.
                    incident.ai_classification = None
                    incident.ai_confidence = None

        elif attachment.media_type == MediaType.AUDIO:
            transcription = whisper_transcriber.transcribe(media_path)
            attachment.validation_details = transcription
            if transcription.get("model_available") and transcription.get("text"):
                transcripts.append(transcription["text"])
                provenance["transcription"] = "whisper"
            else:
                provenance["transcription"] = "unavailable"

        elif attachment.media_type == MediaType.VIDEO:
            attachment.validation_details = {"reason": "video analysis not implemented"}

    # A real transcript is genuine reported content, so it joins the text used
    # for extraction and embedding. An absent one contributes nothing.
    analysis_text = incident.description
    if transcripts:
        analysis_text = " ".join([incident.description] + transcripts)

    # 2. LLM Extraction
    extracted_details = await llm_extractor.extract_details(analysis_text)
    incident.structured_details = extracted_details

    # 3. Vector Embedding. Provenance travels with the vector: dedup must know
    # whether this came from a real model or the offline hash fallback.
    embedding = embeddings_engine.generate_embedding(analysis_text)
    incident.embedding_json = {
        "vector": embedding.vector,
        "model": embedding.model,
        "is_semantic": embedding.is_semantic,
    }

    # 4. Deduplication - find similar incidents and cluster them
    await _run_deduplication(incident, session)

    # 5. Priority score. Previously this only ran for incidents that landed in a
    # cluster of 2+, so every single-report incident kept the placeholder 50.0
    # it was created with and the "priority sorted" queue was sorting a constant.
    if incident.cluster_id is None:
        incident.priority_score = _recalculate_priority(incident, 1)

    # Record which components genuinely ran. structured_details is already
    # exposed on IncidentRead, so this needs no schema change and lets the UI
    # distinguish model-backed triage from a mocked pass.
    provenance["llm"] = "mock" if str(extracted_details).startswith("{'raw_text'") else "llm"
    provenance["embedding"] = embedding.model
    if isinstance(incident.structured_details, dict):
        incident.structured_details = {**incident.structured_details, "ai_provenance": provenance}

    # Status VERIFIED means "AI triage complete" - _run_deduplication filters
    # candidates on it, so the transition must happen even when models are
    # mocked. Honesty about what actually ran is recorded separately.
    incident.status = IncidentStatus.VERIFIED
    await session.commit()


async def _run_deduplication(incident: Incident, session: AsyncSession):
    """Find and merge duplicate incidents using Union-Find clustering."""
    # Get recent verified incidents with embeddings (last 2 hours)
    from datetime import datetime, timedelta
    cutoff = datetime.utcnow() - timedelta(hours=2)
    
    res = await session.execute(
        select(Incident)
        .where(
            Incident.status == IncidentStatus.VERIFIED,
            Incident.id != incident.id,
            Incident.created_at >= cutoff,
            Incident.embedding_json.is_not(None)
        )
    )
    candidates = res.scalars().all()

    if not candidates:
        return

    # Build element list for Union-Find
    all_incidents = [incident] + list(candidates)
    elements = [inc.id for inc in all_incidents]
    uf = UnionFind(elements)

    # Prepare incident data for comparison
    inc_data = {}
    for inc in all_incidents:
        payload = inc.embedding_json or {}
        inc_data[inc.id] = {
            "id": inc.id,
            "latitude": inc.latitude,
            "longitude": inc.longitude,
            "created_at": inc.created_at,
            "vector": payload.get("vector", []),
            # Absent on rows written before provenance was recorded - those used
            # the hash fallback, so defaulting to False is the correct read.
            "is_semantic": payload.get("is_semantic", False),
        }

    # Check all pairs for duplication
    for i, inc1 in enumerate(all_incidents):
        for inc2 in all_incidents[i+1:]:
            if evaluate_incident_duplication(inc_data[inc1.id], inc_data[inc2.id]):
                uf.union(inc1.id, inc2.id)

    clusters = uf.get_clusters()
    
    # For each cluster with >1 incident, create/update cluster record
    for cluster_root, member_ids in clusters.items():
        if len(member_ids) <= 1:
            continue
            
        cluster_incidents = [inc for inc in all_incidents if inc.id in member_ids]
        primary = max(cluster_incidents, key=lambda x: x.severity)
        
        # Check if cluster already exists
        existing_cluster = None
        for inc in cluster_incidents:
            if inc.cluster_id:
                res = await session.execute(select(IncidentCluster).where(IncidentCluster.id == inc.cluster_id))
                existing_cluster = res.scalar_one_or_none()
                if existing_cluster:
                    break
        
        if existing_cluster:
            existing_cluster.corroboration_count = len(member_ids)
            existing_cluster.merged_severity = max(inc.severity for inc in cluster_incidents)
            existing_cluster.updated_at = datetime.utcnow()
            existing_cluster.primary_incident_id = primary.id
            for inc in cluster_incidents:
                inc.cluster_id = existing_cluster.id
        else:
            new_cluster = IncidentCluster(
                cluster_code=f"CLS-{uuid.uuid4().hex[:8].upper()}",
                corroboration_count=len(member_ids),
                primary_incident_id=primary.id,
                merged_severity=max(inc.severity for inc in cluster_incidents)
            )
            session.add(new_cluster)
            await session.flush()
            for inc in cluster_incidents:
                inc.cluster_id = new_cluster.id
        
        # Update priority scores based on corroboration
        for inc in cluster_incidents:
            inc.priority_score = _recalculate_priority(inc, len(member_ids))


def _recalculate_priority(incident: Incident, corroboration_count: int) -> float:
    """Recalculate priority score with updated corroboration count."""
    from backend.app.algorithms.priority_queue import calculate_priority_score
    from datetime import datetime
    
    time_in_queue = (datetime.utcnow() - incident.created_at).total_seconds() / 3600.0
    return calculate_priority_score(
        severity=incident.severity,
        corroboration_count=corroboration_count,
        time_in_queue_hours=time_in_queue,
        category=incident.category.value
    )

