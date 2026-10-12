import os
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
        longitude=80.2464,
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


@pytest.mark.asyncio
async def test_image_attachment_gets_exif_and_validation_populated(db: AsyncSession):
    """
    MediaAttachment.file_path holds a URL ("/media_uploads/x.jpg"). Handing that
    straight to os.path.exists always fails, so EXIF verification silently did
    nothing and validation_status stayed PENDING forever. This locks the
    URL -> filesystem resolution as well as the EXIF wiring.
    """
    from PIL import Image
    from backend.app.models.media import MediaAttachment, MediaType, ValidationStatus
    from backend.app.services.storage import UPLOAD_DIR

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filename = "pytest_exif_probe.jpg"
    Image.new("RGB", (16, 16), color="red").save(os.path.join(UPLOAD_DIR, filename))

    try:
        incident = Incident(
            tracking_id="INC-EXIF-001",
            category=IncidentCategory.FIRE,
            description="Smoke reported from a warehouse roof.",
            latitude=13.0760,
            longitude=80.2777,
            status=IncidentStatus.REPORTED,
        )
        db.add(incident)
        await db.flush()

        attachment = MediaAttachment(
            incident_id=incident.id,
            file_path=f"/media_uploads/{filename}",
            media_type=MediaType.IMAGE,
            file_size_bytes=100,
            validation_status=ValidationStatus.PENDING,
        )
        db.add(attachment)
        await db.commit()

        await _async_process(incident.id, session=db)

        await db.refresh(attachment)
        assert attachment.validation_status != ValidationStatus.PENDING
        assert attachment.exif_data is not None
        # A PIL-generated JPEG carries no GPS tags, so this is the honest verdict.
        assert attachment.exif_data["status"] == "NO_EXIF"
    finally:
        probe = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(probe):
            os.remove(probe)


@pytest.mark.asyncio
async def test_audio_attachment_is_not_sent_to_image_detector(db: AsyncSession, monkeypatch):
    """An audio-only report used to feed a .webm to the YOLOv8 image detector."""
    from backend.app.models.media import MediaAttachment, MediaType
    from ai_pipeline.vision import detector as detector_module

    def _fail(*args, **kwargs):
        raise AssertionError("image detector must not be called for audio attachments")

    monkeypatch.setattr(detector_module.yolo_detector, "detect", _fail)

    incident = Incident(
        tracking_id="INC-AUDIO-001",
        category=IncidentCategory.MEDICAL_EMERGENCY,
        description="Caller reported a collapse.",
        latitude=13.0760,
        longitude=80.2777,
        status=IncidentStatus.REPORTED,
    )
    db.add(incident)
    await db.flush()
    db.add(MediaAttachment(
        incident_id=incident.id,
        file_path="/media_uploads/voicenote.webm",
        media_type=MediaType.AUDIO,
        file_size_bytes=100,
    ))
    await db.commit()

    await _async_process(incident.id, session=db)
    await db.refresh(incident)
    assert incident.status == IncidentStatus.VERIFIED


@pytest.mark.asyncio
async def test_priority_score_is_computed_not_left_at_placeholder(db: AsyncSession):
    """Un-clustered incidents used to keep the literal 50.0 they were created with."""
    incident = Incident(
        tracking_id="INC-PRIORITY-001",
        category=IncidentCategory.FIRE,
        description="Major fire at a chemical storage unit.",
        latitude=13.0760,
        longitude=80.2777,
        status=IncidentStatus.REPORTED,
        severity=5,
        priority_score=50.0,
    )
    db.add(incident)
    await db.commit()

    await _async_process(incident.id, session=db)
    await db.refresh(incident)
    assert incident.priority_score != 50.0


@pytest.mark.asyncio
async def test_duplicate_reports_are_clustered_end_to_end(db: AsyncSession):
    """
    The Union-Find showpiece, exercised through the real pipeline: two citizens
    report the same fire from the same corner, minutes apart. They must end up
    in one cluster with a merged report count.
    """
    from ai_pipeline.nlp.embeddings import embeddings_engine
    from backend.app.models.incident import IncidentCluster
    from sqlalchemy import select

    if not embeddings_engine.generate_embedding("probe").is_semantic:
        pytest.skip("sentence-transformers not installed - clustering is inert by design")

    first = Incident(
        tracking_id="INC-DUP-0001",
        category=IncidentCategory.FIRE,
        description="Building fire with thick smoke pouring from the second floor",
        latitude=13.0760, longitude=80.2777, status=IncidentStatus.REPORTED, priority_score=50.0,
    )
    second = Incident(
        tracking_id="INC-DUP-0002",
        category=IncidentCategory.FIRE,
        description="Fire in a building, heavy smoke coming out of the upper floor",
        latitude=13.0761, longitude=80.2778, status=IncidentStatus.REPORTED, priority_score=50.0,
    )
    db.add_all([first, second])
    await db.commit()
    await db.refresh(first)
    await db.refresh(second)

    await _async_process(first.id, session=db)
    await _async_process(second.id, session=db)

    await db.refresh(first)
    await db.refresh(second)

    assert first.cluster_id is not None, "duplicate reports were not clustered"
    assert first.cluster_id == second.cluster_id, "duplicates landed in different clusters"

    cluster = (await db.execute(
        select(IncidentCluster).where(IncidentCluster.id == first.cluster_id)
    )).scalar_one()
    assert cluster.corroboration_count >= 2


@pytest.mark.asyncio
async def test_unrelated_reports_are_not_clustered_end_to_end(db: AsyncSession):
    """
    The audit's headline bug: a fire and a pothole at the same corner scored
    0.811 on the hash fallback against a 0.75 threshold and became one incident.
    """
    fire = Incident(
        tracking_id="INC-SEP-0001",
        category=IncidentCategory.FIRE,
        description="Building fire with thick smoke pouring from the second floor",
        latitude=13.0760, longitude=80.2777, status=IncidentStatus.REPORTED, priority_score=50.0,
    )
    pothole = Incident(
        tracking_id="INC-SEP-0002",
        category=IncidentCategory.INFRASTRUCTURE_DAMAGE,
        description="Large pothole causing traffic delay on the highway",
        latitude=13.0761, longitude=80.2778, status=IncidentStatus.REPORTED, priority_score=50.0,
    )
    db.add_all([fire, pothole])
    await db.commit()
    await db.refresh(fire)
    await db.refresh(pothole)

    await _async_process(fire.id, session=db)
    await _async_process(pothole.id, session=db)

    await db.refresh(fire)
    await db.refresh(pothole)

    assert not (fire.cluster_id is not None and fire.cluster_id == pothole.cluster_id), \
        "a fire report and a pothole report were merged into one incident"


@pytest.mark.asyncio
async def test_video_attachment_is_analysed_via_keyframes(db: AsyncSession, monkeypatch):
    """
    Video used to be stored with {"reason": "video analysis not implemented"}.
    Now keyframes are sampled and run through the detector; the best frame is
    written beside the video and exposed as keyframe_url for the dashboard.
    """
    import cv2
    import numpy as np
    from backend.app.models.media import MediaAttachment, MediaType, ValidationStatus
    from backend.app.services.storage import UPLOAD_DIR

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    video = os.path.join(UPLOAD_DIR, "pytest_probe_clip.mp4")
    writer = cv2.VideoWriter(video, cv2.VideoWriter_fourcc(*"mp4v"), 10, (64, 48))
    for i in range(20):
        frame = np.zeros((48, 64, 3), dtype=np.uint8)
        frame[:, : i * 3] = (0, 0, 255)
        writer.write(frame)
    writer.release()

    # Detector stubbed: the test is about the routing, not YOLO's opinion of a
    # red rectangle.
    class FakeDetector:
        def detect(self, path):
            return {"model_available": True, "detected_objects": ["fire"], "highest_confidence": 0.77,
                    "estimated_severity": 4, "hazard_label": "fire"}
    from backend.app.tasks import ai_tasks
    monkeypatch.setattr(ai_tasks, "yolo_detector", FakeDetector())

    try:
        incident = Incident(
            tracking_id="INC-VID-001", category=IncidentCategory.FIRE,
            description="Flames from a shop shutter.", latitude=19.0, longitude=72.8,
            phone_number="+910000000000", status=IncidentStatus.REPORTED, severity=1, priority_score=50,
        )
        incident.media_attachments.append(MediaAttachment(
            file_path="/media_uploads/pytest_probe_clip.mp4", media_type=MediaType.VIDEO, file_size_bytes=1,
        ))
        db.add(incident)
        await db.commit()
        await db.refresh(incident)

        await _async_process(incident.id, session=db)
        await db.refresh(incident)

        from sqlalchemy import select
        att = (await db.execute(
            select(MediaAttachment).where(MediaAttachment.incident_id == incident.id)
        )).scalar_one()
        assert att.validation_details["frames_sampled"] == 3
        assert att.validation_details["detected_objects"] == ["fire"]
        assert att.validation_details["keyframe_url"].startswith("/media_uploads/pytest_probe_clip_kf")
        assert att.validation_status == ValidationStatus.VALID
        assert incident.ai_classification == "fire"
        assert incident.severity == 4
        assert incident.structured_details["ai_provenance"]["vision"] == "yolov8-keyframes"
    finally:
        for name in os.listdir(UPLOAD_DIR):
            if name.startswith("pytest_probe_clip"):
                os.remove(os.path.join(UPLOAD_DIR, name))


def _stub_media_only_pipeline(monkeypatch, summary):
    """Detector, EXIF and LLM stubbed; returns the list of texts the LLM was given."""
    from types import SimpleNamespace
    from backend.app.tasks import ai_tasks

    class FakeDetector:
        def detect(self, path):
            # "car" was a weak guess: it counts for severity but must not be described.
            return {"model_available": True, "detected_objects": ["person", "bus", "car"],
                    "confident_objects": ["bus", "person"], "highest_confidence": 0.9,
                    "estimated_severity": 4, "hazard_label": "bus"}

    seen = []

    async def extract(text):
        seen.append(text)
        if summary is None:
            return {"model_available": False, "parsed": False}
        return {"model_available": True, "parsed": True, "severity_rating": 3, "summary": summary}

    monkeypatch.setattr(ai_tasks, "yolo_detector", FakeDetector())
    monkeypatch.setattr(ai_tasks, "exif_verifier",
                        SimpleNamespace(verify_image_exif=lambda *a: {"is_valid": True}))
    monkeypatch.setattr(ai_tasks, "llm_extractor", SimpleNamespace(
        extract_details=extract, provider=SimpleNamespace(name="stub", model_name="stub")))
    return seen


async def _media_only_incident(db, tracking_id):
    from backend.app.models.media import MediaAttachment, MediaType
    incident = Incident(
        tracking_id=tracking_id, category=IncidentCategory.ROAD_ACCIDENT, description="",
        latitude=13.0067, longitude=80.2206, location_name="Kathipara junction",
        status=IncidentStatus.REPORTED, severity=2, priority_score=50,
    )
    incident.media_attachments.append(MediaAttachment(
        file_path="/media_uploads/pytest_no_such_photo.jpg", media_type=MediaType.IMAGE, file_size_bytes=1,
    ))
    db.add(incident)
    await db.commit()
    await db.refresh(incident)
    return incident


@pytest.mark.asyncio
async def test_media_only_report_gets_ai_description_from_evidence(db: AsyncSession, monkeypatch):
    seen = _stub_media_only_pipeline(monkeypatch, "Bus and pedestrians involved in a road accident at Kathipara junction.")
    incident = await _media_only_incident(db, "INC-AIDESC-1")

    await _async_process(incident.id, session=db)
    await db.refresh(incident)

    # The model was given the evidence, not an empty report.
    assert "bus, person" in seen[0] and "road accident" in seen[0] and "Kathipara junction" in seen[0]
    assert "car" not in seen[0]  # below DESCRIBE_MIN_CONFIDENCE
    assert incident.description == "Bus and pedestrians involved in a road accident at Kathipara junction."
    assert incident.structured_details["ai_provenance"]["description"] == "llm"


@pytest.mark.asyncio
async def test_media_only_report_falls_back_to_plain_description_without_llm(db: AsyncSession, monkeypatch):
    _stub_media_only_pipeline(monkeypatch, None)
    incident = await _media_only_incident(db, "INC-AIDESC-2")

    await _async_process(incident.id, session=db)
    await db.refresh(incident)

    assert incident.description == ("Road accident reported with media and no written description. "
                                    "Detected in the media: bus, person.")
    assert incident.structured_details["ai_provenance"]["description"] == "template"


@pytest.mark.asyncio
async def test_written_description_is_never_replaced(db: AsyncSession, monkeypatch):
    _stub_media_only_pipeline(monkeypatch, "Something else entirely.")
    incident = await _media_only_incident(db, "INC-AIDESC-3")
    incident.description = "Bus hit a scooter, rider on the ground."
    await db.commit()

    await _async_process(incident.id, session=db)
    await db.refresh(incident)

    assert incident.description == "Bus hit a scooter, rider on the ground."
    assert "description" not in incident.structured_details["ai_provenance"]
