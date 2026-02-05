"""Celery configuration for background tasks."""

from celery import Celery
from datetime import timedelta

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Create Celery app
celery_app = Celery(
    "dependency_visualizer",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour max per task
    task_soft_time_limit=3000,  # 50 minutes soft limit
    worker_prefetch_multiplier=1,  # Don't prefetch tasks
    worker_max_tasks_per_child=100,  # Restart worker after 100 tasks
    task_acks_late=True,  # Acknowledge task after completion
    task_reject_on_worker_lost=True,  # Reject if worker dies
    result_expires=3600,  # Keep results for 1 hour
)

# Task routing (optional - can route tasks to specific queues)
celery_app.conf.task_routes = {
    "app.tasks.analysis.*": {"queue": "analysis"},
    "app.tasks.export.*": {"queue": "export"},
    "app.tasks.maintenance.*": {"queue": "maintenance"},
}

# Periodic tasks
celery_app.conf.beat_schedule = {
    "cleanup-cache": {
        "task": "app.tasks.maintenance.cleanup_cache",
        "schedule": timedelta(hours=settings.CACHE_CLEANUP_INTERVAL_HOURS),
        "args": (settings.CACHE_TTL_DAYS,),
    }
}

logger.info("Celery configured", broker=settings.CELERY_BROKER_URL)
