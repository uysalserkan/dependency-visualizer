"""Health check utilities for production monitoring."""

import socket
from pathlib import Path

from app.config import settings
from app.core.logging import get_logger
from app.core.redis_cache import RedisCache
from app.core.go_extractor import _go_extractor_available

logger = get_logger(__name__)


async def check_cache_database() -> tuple[bool, str]:
    """Check if cache database is accessible.
    
    Returns:
        Tuple of (is_healthy, message)
    """
    try:
        cache_path = Path(settings.CACHE_DB_PATH)
        cache_dir = cache_path.parent
        
        # Check if directory exists and is writable
        if not cache_dir.exists():
            cache_dir.mkdir(parents=True, exist_ok=True)
        
        if not cache_dir.is_dir():
            return False, f"Cache directory is not a directory: {cache_dir}"
        
        # Try to create a test file
        test_file = cache_dir / ".health_check"
        try:
            test_file.touch()
            test_file.unlink()
            return True, "Cache database accessible"
        except Exception as e:
            return False, f"Cache directory not writable: {str(e)}"
            
    except Exception as e:
        logger.error("Cache database health check failed", error=str(e))
        return False, f"Cache check failed: {str(e)}"


async def check_filesystem_access() -> tuple[bool, str]:
    """Check if filesystem is accessible for analysis.
    
    Returns:
        Tuple of (is_healthy, message)
    """
    try:
        # Check if we can read the current directory
        cwd = Path.cwd()
        if not cwd.exists():
            return False, "Current directory not accessible"
        
        # Check if we can list files
        try:
            _ = list(cwd.iterdir())
            return True, "Filesystem accessible"
        except PermissionError:
            return False, "Insufficient filesystem permissions"
            
    except Exception as e:
        logger.error("Filesystem health check failed", error=str(e))
        return False, f"Filesystem check failed: {str(e)}"


async def run_health_checks() -> dict:
    """Run all health checks.
    
    Returns:
        Dictionary with health check results
    """
    results = {}
    
    # Check cache database
    cache_ok, cache_msg = await check_cache_database()
    results["cache_db"] = {
        "status": "healthy" if cache_ok else "unhealthy",
        "message": cache_msg,
    }

    # Check Redis cache (if enabled)
    redis_ok = True
    redis_msg = "Redis disabled"
    if settings.REDIS_ENABLED:
        redis_cache = RedisCache()
        redis_ok = redis_cache.is_available
        redis_msg = "Redis reachable" if redis_ok else "Redis unavailable"
    results["redis"] = {
        "status": "healthy" if redis_ok else "unhealthy",
        "message": redis_msg,
    }

    # Check Jaeger (if tracing enabled)
    jaeger_ok = True
    jaeger_msg = "Tracing disabled"
    if settings.TRACING_ENABLED:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            sock.settimeout(1.0)
            sock.connect((settings.JAEGER_HOST, settings.JAEGER_PORT))
            sock.close()
            jaeger_ok = True
            jaeger_msg = "Jaeger endpoint reachable"
        except Exception as e:
            jaeger_ok = False
            jaeger_msg = f"Jaeger unreachable: {e}"
    results["jaeger"] = {
        "status": "healthy" if jaeger_ok else "unhealthy",
        "message": jaeger_msg,
    }

    # Check Sentry config (if enabled)
    sentry_ok = True
    sentry_msg = "Sentry not configured"
    if settings.SENTRY_DSN:
        sentry_ok = True
        sentry_msg = "Sentry configured"
    results["sentry"] = {
        "status": "healthy" if sentry_ok else "degraded",
        "message": sentry_msg,
    }

    # Check Go extractor (if required)
    go_ok = True
    go_msg = "Extractor backend not set to go"
    if settings.EXTRACTOR_BACKEND == "go":
        go_ok = _go_extractor_available()
        go_msg = "Go extractor available" if go_ok else "Go extractor missing or not executable"
    results["go_extractor"] = {
        "status": "healthy" if go_ok else "unhealthy",
        "message": go_msg,
    }
    
    # Check filesystem
    fs_ok, fs_msg = await check_filesystem_access()
    results["filesystem"] = {
        "status": "healthy" if fs_ok else "unhealthy",
        "message": fs_msg,
    }
    
    # Overall status
    all_healthy = cache_ok and fs_ok and redis_ok and jaeger_ok and go_ok
    results["status"] = "healthy" if all_healthy else "degraded"
    
    return results
