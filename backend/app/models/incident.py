import enum
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, DateTime, Enum, ForeignKey, Float, Integer, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.models.base import Base

class IncidentCategory(str, enum.Enum):
    ROAD_ACCIDENT = "road_accident"
    FIRE = "fire"
    INFRASTRUCTURE_DAMAGE = "infrastructure_damage"
    FLOODING = "flooding"
    ENVIRONMENTAL_HAZARD = "environmental_hazard"
    ELECTRICAL_HAZARD = "electrical_hazard"
    MEDICAL_EMERGENCY = "medical_emergency"
    CRIMINAL_ACTIVITY = "criminal_activity"

class IncidentStatus(str, enum.Enum):
    REPORTED = "reported"
    AI_PROCESSING = "ai_processing"
    VERIFIED = "verified"
    DISPATCHED = "dispatched"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"

class IncidentCluster(Base):
    __tablename__ = "incident_clusters"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    cluster_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    corroboration_count: Mapped[int] = mapped_column(Integer, default=1)
    primary_incident_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    merged_severity: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    incidents: Mapped[List["Incident"]] = relationship("Incident", back_populates="cluster", foreign_keys="[Incident.cluster_id]")

class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    tracking_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    category: Mapped[IncidentCategory] = mapped_column(Enum(IncidentCategory), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    phone_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    location_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    severity: Mapped[int] = mapped_column(Integer, default=1)  # 1 to 5
    priority_score: Mapped[float] = mapped_column(Float, default=0.0, index=True)
    status: Mapped[IncidentStatus] = mapped_column(Enum(IncidentStatus), default=IncidentStatus.REPORTED, index=True)
    
    # AI Extraction Metadata
    ai_classification: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ai_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    structured_details: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    embedding_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    
    # Relationships
    cluster_id: Mapped[Optional[int]] = mapped_column(ForeignKey("incident_clusters.id"), nullable=True)
    assigned_responder_id: Mapped[Optional[int]] = mapped_column(ForeignKey("responders.id"), nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    cluster: Mapped[Optional["IncidentCluster"]] = relationship("IncidentCluster", back_populates="incidents", foreign_keys=[cluster_id])
    assigned_responder: Mapped[Optional["Responder"]] = relationship("Responder", back_populates="assigned_incidents")
    media_attachments: Mapped[List["MediaAttachment"]] = relationship("MediaAttachment", back_populates="incident")
