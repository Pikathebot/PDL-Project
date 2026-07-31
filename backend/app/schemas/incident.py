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
