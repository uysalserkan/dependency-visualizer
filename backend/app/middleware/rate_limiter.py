"""Rate limiting middleware using slowapi."""

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


# Shared limiter instance (used by main.py and by route decorators in routes.py)
def _rate_limit_storage_uri() -> str:
    """Resolve rate limit storage URI based on settings.

    Returns:
        Storage URI for slowapi (memory:// or redis://...)
    """
    if settings.RATE_LIMIT_STORAGE_URL:
        return settings.RATE_LIMIT_STORAGE_URL
    if settings.REDIS_ENABLED:
        return settings.REDIS_URL
    return "memory://"


limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"],  # Global fallback
    storage_uri=_rate_limit_storage_uri(),
    headers_enabled=True,  # Add rate limit headers to responses
)


def get_limiter() -> Limiter:
    """Return the shared rate limiter instance.

    Returns:
        Configured Limiter instance
    """
    return limiter


async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Handle rate limit exceeded errors.
    
    Args:
        request: FastAPI request
        exc: Rate limit exceeded exception
        
    Returns:
        JSON response with 429 status
    """
    logger.warning(
        "Rate limit exceeded",
        path=request.url.path,
        client_ip=get_remote_address(request),
        limit=exc.detail,
    )
    
    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "detail": "Too many requests. Please try again later.",
            "retry_after": getattr(exc, "retry_after", None),
        },
    )
