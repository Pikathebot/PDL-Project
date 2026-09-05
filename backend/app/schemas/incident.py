from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field
from backend.app.models.incident import IncidentCategory, IncidentStatus
from backend.app.schemas.media import MediaAttachmentRead

class IncidentBase(BaseModel):
    category: IncidentCategory
    description: str
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    location_name: Optional[str] = None
    phone_number: Optional[str] = None

class IncidentCreate(IncidentBase):
    pass

class IncidentUpdateStatus(BaseModel):
    status: IncidentStatus
    assigned_responder_id: Optional[int] = None

class IncidentRead(IncidentBase):
    id: int
    tracking_id: str
    severity: int
    priority_score: float
    status: IncidentStatus
    ai_classification: Optional[str] = None
    ai_confidence: Optional[float] = None
    structured_details: Optional[Dict[str, Any]] = None
    cluster_id: Optional[int] = None
    assigned_responder_id: Optional[int] = None
    media_attachments: List[MediaAttachmentRead] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IncidentTrackRead(BaseModel):
    """
    Public view of an incident, returned by the tracking-ID lookup.

    Deliberately narrower than IncidentRead: the tracking endpoint is
    unauthenticated, so it must not echo phone_number back to anyone who
    guesses a tracking ID. It also drops the dispatcher-only fields
    (priority_score, assigned_responder_id, cluster_id) that a citizen has no
    use for.
    """
    tracking_id: str
    category: IncidentCategory
    description: str
    location_name: Optional[str] = None
    status: IncidentStatus
    severity: int
    media_attachments: List[MediaAttachmentRead] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
