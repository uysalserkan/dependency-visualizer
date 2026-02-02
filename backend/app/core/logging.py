"""Structured logging configuration."""

import logging
import sys
from pathlib import Path

import structlog

from app.middleware.request_id import get_request_id


def bind_request_context(_, __, event_dict):
    """Bind request ID to all log entries.
    
    Args:
        _: Unused logger
        __: Unused method name
        event_dict: Log event dictionary
        
    Returns:
        Updated event dictionary with request ID
    """
    request_id = get_request_id()
    if request_id:
        event_dict["request_id"] = request_id
    return event_dict


def configure_logging(debug: bool = False) -> None:
    """Configure structured logging for the application.
    
    Args:
        debug: Enable debug level logging
    """
    # Set log level
    log_level = logging.DEBUG if debug else logging.INFO
    
    # Configure standard logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=log_level,
    )
    
    # Configure structlog processors
    processors = [
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.contextvars.merge_contextvars,
        bind_request_context,  # Add request ID to all logs
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer() if not debug else structlog.dev.ConsoleRenderer(),
    ]
    
    # Configure structlog
    structlog.configure(
        processors=processors,
        wrapper_class=structlog.stdlib.BoundLogger,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    """Get a configured logger instance.
    
    Args:
        name: Logger name (defaults to caller's module)
        
    Returns:
        Configured structlog logger
    """
    return structlog.get_logger(name)
