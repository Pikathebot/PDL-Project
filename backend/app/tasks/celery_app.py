from celery import Celery
from backend.app.core.config import settings

celery_app = Celery(
    "sentinel_tasks",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    include=["backend.app.tasks.ai_tasks"],
)

# Test task
@celery_app.task(name="backend.app.tasks.celery_app.test_task")
def test_task(name: str) -> str:
    return f"Hello, {name}! Task execution succeeded."
