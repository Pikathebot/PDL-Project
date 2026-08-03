from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from backend.app.models.user import UserRole, ResponderStatus

class ResponderRead(BaseModel):
    id: int
    user_id: int
    name: str
    department: str
    status: ResponderStatus
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    distance_km: Optional[float] = None
    last_active: datetime

    model_config = ConfigDict(from_attributes=True)

class DispatchRequest(BaseModel):
    responder_id: int
