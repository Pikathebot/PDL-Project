from contextlib import asynccontextmanager
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.core.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks (like connecting database pools, warming models, etc.)
    yield
    # Shutdown tasks (closing connections)

from backend.app.api.v1.router import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Set CORS origins
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

app.include_router(api_router, prefix=settings.API_V1_STR)

media_dir = os.path.join(os.getcwd(), "media_uploads")
os.makedirs(media_dir, exist_ok=True)
app.mount("/media_uploads", StaticFiles(directory=media_dir), name="media_uploads")

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "version": "0.0.1"
    }
