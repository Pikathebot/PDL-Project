import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import String, DateTime, Enum, ForeignKey, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base

class MediaType(str, enum.Enum):
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"

class ValidationStatus(str, enum.Enum):
    PENDING = "pending"
    VALID = "valid"
    SUSPICIOUS = "suspicious"
    REJECTED = "rejected"

class MediaAttachment(Base):
    __tablename__ = "media_attachments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    incident_id: Mapped[int] = mapped_column(ForeignKey("incidents.id"), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    media_type: Mapped[MediaType] = mapped_column(Enum(MediaType), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    
    validation_status: Mapped[ValidationStatus] = mapped_column(Enum(ValidationStatus), default=ValidationStatus.PENDING)
    exif_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    validation_details: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    incident: Mapped["Incident"] = relationship("Incident", back_populates="media_attachments")
