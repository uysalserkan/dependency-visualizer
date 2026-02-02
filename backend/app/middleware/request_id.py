"""Request ID tracking middleware for correlation and tracing."""

import uuid
from contextvars import ContextVar
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# Context variable to store request ID across async calls
request_id_var: ContextVar[str] = ContextVar("request_id", default="")


def get_request_id() -> str:
    """Get the current request ID from context.
    
    Returns:
        Request ID string
    """
    return request_id_var.get()


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Middleware to generate and track request IDs."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and add request ID.
        
        Args:
            request: Incoming request
            call_next: Next middleware/handler
            
        Returns:
            Response with X-Request-ID header
        """
        # Check if request already has an ID (from proxy/load balancer)
        request_id = request.headers.get("X-Request-ID")
        
        # Generate new ID if not present
        if not request_id:
            request_id = str(uuid.uuid4())
        
        # Store in context for logging and error handling
        request_id_var.set(request_id)
        
        # Process request
        response = await call_next(request)
        
        # Add request ID to response headers
        response.headers["X-Request-ID"] = request_id
        
        return response
