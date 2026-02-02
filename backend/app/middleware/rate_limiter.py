"""Rate limiting middleware using slowapi."""

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.logging import get_logger

logger = get_logger(__name__)


# Shared limiter instance (used by main.py and by route decorators in routes.py)
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"],  # Global fallback
    storage_uri="memory://",  # In-memory storage (use Redis for production scale)
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
