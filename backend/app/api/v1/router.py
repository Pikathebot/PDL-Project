from fastapi import APIRouter
from backend.app.api.v1.endpoints import incidents

api_router = APIRouter()
api_router.include_router(incidents.router, prefix="/incidents", tags=["Incidents"])
