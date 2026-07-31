from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict
from backend.app.models.media import MediaType, ValidationStatus

class MediaAttachmentBase(BaseModel):
    media_type: MediaType

class MediaAttachmentCreate(MediaAttachmentBase):
    file_path: str
    file_size_bytes: int = 0
    exif_data: Optional[Dict[str, Any]] = None

class MediaAttachmentRead(MediaAttachmentBase):
    id: int
    incident_id: int
    file_path: str
    file_size_bytes: int
    validation_status: ValidationStatus
    exif_data: Optional[Dict[str, Any]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
