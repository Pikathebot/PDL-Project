from fastapi import APIRouter
from backend.app.api.v1.endpoints import auth, incidents

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(incidents.router, prefix="/incidents", tags=["Incidents"])
