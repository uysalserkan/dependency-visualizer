"""Prometheus metrics instrumentation."""

from prometheus_client import Counter, Histogram, Gauge, Info
from prometheus_fastapi_instrumentator import Instrumentator

from app.core.logging import get_logger

logger = get_logger(__name__)

# Custom metrics
analysis_requests_total = Counter(
    "analysis_requests_total",
    "Total number of analysis requests",
    ["status"],  # labels: success, error, cached
)

analysis_duration_seconds = Histogram(
    "analysis_duration_seconds",
    "Time spent analyzing projects",
    buckets=[0.1, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0, 120.0],
)

cache_hits_total = Counter(
    "cache_hits_total",
    "Total number of cache hits",
)

cache_misses_total = Counter(
    "cache_misses_total",
    "Total number of cache misses",
)

active_analyses = Gauge(
    "active_analyses",
    "Number of analyses currently in progress",
)

memory_cache_size = Gauge(
    "memory_cache_size",
    "Number of items in memory cache",
)

# Application info
app_info = Info(
    "app_info",
    "Application information",
)


def setup_metrics(app, app_name: str = "dependency_visualizer", app_version: str = "0.1.0"):
    """Configure Prometheus metrics for FastAPI application.
    
    Args:
        app: FastAPI application instance
        app_name: Application name
        app_version: Application version
    """
    # Set application info
    app_info.info({"name": app_name, "version": app_version})
    
    # Initialize instrumentator (default metrics are added automatically when no add() is used)
    instrumentator = Instrumentator(
        should_group_status_codes=False,
        should_ignore_untemplated=True,
        should_respect_env_var=True,
        should_instrument_requests_inprogress=True,
        excluded_handlers=["/metrics"],  # Don't track metrics endpoint itself
        env_var_name="ENABLE_METRICS",
        inprogress_name="http_requests_inprogress",
        inprogress_labels=True,
    )

    # Instrument the app
    instrumentator.instrument(app)
    
    # Expose metrics endpoint
    instrumentator.expose(app, endpoint="/metrics", include_in_schema=False)
    
    logger.info("Prometheus metrics configured", endpoint="/metrics")
    
    return instrumentator
