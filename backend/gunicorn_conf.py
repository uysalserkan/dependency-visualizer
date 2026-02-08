"""Gunicorn configuration for production."""

import multiprocessing
import os


def _default_workers() -> int:
    cpu = multiprocessing.cpu_count()
    return max(2, (cpu * 2) + 1)


workers = int(os.getenv("WEB_CONCURRENCY", _default_workers()))
worker_class = "uvicorn.workers.UvicornWorker"
bind = "0.0.0.0:8000"
keepalive = int(os.getenv("GUNICORN_KEEPALIVE", "5"))
timeout = int(os.getenv("GUNICORN_TIMEOUT", "120"))
graceful_timeout = int(os.getenv("GUNICORN_GRACEFUL_TIMEOUT", "30"))
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("GUNICORN_LOG_LEVEL", "info")
