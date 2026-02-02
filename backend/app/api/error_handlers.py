"""API error handlers."""

from fastapi import Request, status
from fastapi.responses import JSONResponse

from app.core.exceptions import (
    AnalysisError,
    AppError,
    NotFoundError,
    ParseError,
    SecurityError,
    ValidationError,
)
from app.core.logging import get_logger

logger = get_logger(__name__)


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    """Handle application errors.
    
    Args:
        request: FastAPI request
        exc: Application error
        
    Returns:
        JSON error response
    """
    # Determine status code based on error type
    if isinstance(exc, ValidationError):
        status_code = status.HTTP_400_BAD_REQUEST
        error_code = "VALIDATION_ERROR"
    elif isinstance(exc, SecurityError):
        status_code = status.HTTP_403_FORBIDDEN
        error_code = "SECURITY_ERROR"
    elif isinstance(exc, NotFoundError):
        status_code = status.HTTP_404_NOT_FOUND
        error_code = "NOT_FOUND"
    elif isinstance(exc, ParseError):
        status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        error_code = "PARSE_ERROR"
    elif isinstance(exc, AnalysisError):
        status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        error_code = "ANALYSIS_ERROR"
    else:
        status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        error_code = "INTERNAL_ERROR"
    
    # Log error
    logger.error(
        "Application error",
        error_type=type(exc).__name__,
        error_code=error_code,
        message=exc.message,
        details=exc.details,
        path=request.url.path,
    )
    
    # Return error response
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": error_code,
                "message": exc.message,
                "details": exc.details if logger.isEnabledFor("DEBUG") else {},
            }
        },
    )


async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected errors.
    
    Args:
        request: FastAPI request
        exc: Exception
        
    Returns:
        JSON error response
    """
    logger.exception(
        "Unexpected error",
        path=request.url.path,
        error=str(exc),
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An internal error occurred",
                "details": {},
            }
        },
    )


def register_error_handlers(app) -> None:
    """Register error handlers with FastAPI app.
    
    Args:
        app: FastAPI application
    """
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(Exception, generic_error_handler)
