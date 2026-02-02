"""Audit logging for security and compliance."""

import json
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any

from pydantic import BaseModel

from app.config import settings
from app.core.logging import get_logger
from app.middleware.request_id import get_request_id

logger = get_logger(__name__)


class AuditAction(str, Enum):
    """Audit action types."""
    
    # Authentication
    LOGIN = "login"
    LOGOUT = "logout"
    LOGIN_FAILED = "login_failed"
    TOKEN_REFRESH = "token_refresh"
    
    # Authorization
    ACCESS_DENIED = "access_denied"
    PERMISSION_GRANT = "permission_grant"
    PERMISSION_REVOKE = "permission_revoke"
    
    # Data Operations
    ANALYSIS_CREATE = "analysis_create"
    ANALYSIS_READ = "analysis_read"
    ANALYSIS_DELETE = "analysis_delete"
    ANALYSIS_EXPORT = "analysis_export"
    
    # Configuration
    CONFIG_CHANGE = "config_change"
    SETTING_UPDATE = "setting_update"
    
    # Admin Operations
    USER_CREATE = "user_create"
    USER_UPDATE = "user_update"
    USER_DELETE = "user_delete"
    ROLE_ASSIGN = "role_assign"
    
    # System
    SYSTEM_START = "system_start"
    SYSTEM_STOP = "system_stop"
    CACHE_CLEAR = "cache_clear"


class AuditLevel(str, Enum):
    """Audit log severity levels."""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class AuditEntry(BaseModel):
    """Audit log entry."""
    timestamp: datetime
    request_id: str
    action: AuditAction
    level: AuditLevel
    username: str | None
    user_roles: list[str] | None
    ip_address: str | None
    resource: str | None
    details: dict[str, Any] | None
    success: bool
    error_message: str | None = None


class AuditLogger:
    """Audit logger for security-critical events."""
    
    def __init__(self, log_path: str | Path | None = None):
        """Initialize audit logger.
        
        Args:
            log_path: Path to audit log file
        """
        self.log_path = Path(log_path or settings.AUDIT_LOG_PATH)
        self.enabled = settings.AUDIT_LOG_ENABLED
        
        if self.enabled:
            # Ensure log directory exists
            self.log_path.parent.mkdir(parents=True, exist_ok=True)
            logger.info("Audit logging enabled", log_path=str(self.log_path))
    
    def log(
        self,
        action: AuditAction,
        success: bool,
        username: str | None = None,
        user_roles: list[str] | None = None,
        ip_address: str | None = None,
        resource: str | None = None,
        details: dict[str, Any] | None = None,
        error_message: str | None = None,
        level: AuditLevel = AuditLevel.INFO,
    ):
        """Log an audit event.
        
        Args:
            action: Action being audited
            success: Whether action was successful
            username: Username performing action
            user_roles: User's roles
            ip_address: IP address of requester
            resource: Resource being accessed
            details: Additional details
            error_message: Error message if failed
            level: Severity level
        """
        if not self.enabled:
            return
        
        entry = AuditEntry(
            timestamp=datetime.utcnow(),
            request_id=get_request_id(),
            action=action,
            level=level,
            username=username,
            user_roles=user_roles,
            ip_address=ip_address,
            resource=resource,
            details=details,
            success=success,
            error_message=error_message,
        )
        
        # Write to audit log file
        try:
            with open(self.log_path, 'a') as f:
                f.write(entry.model_dump_json() + '\n')
        except Exception as e:
            logger.error("Failed to write audit log", error=str(e))
        
        # Also log to application logger
        log_method = logger.info if success else logger.warning
        log_method(
            f"AUDIT: {action.value}",
            username=username,
            success=success,
            resource=resource,
            error=error_message,
        )
    
    def log_authentication(
        self,
        username: str,
        success: bool,
        ip_address: str | None = None,
        error_message: str | None = None,
    ):
        """Log authentication attempt.
        
        Args:
            username: Username attempting login
            success: Whether login was successful
            ip_address: IP address of login attempt
            error_message: Error message if failed
        """
        action = AuditAction.LOGIN if success else AuditAction.LOGIN_FAILED
        level = AuditLevel.INFO if success else AuditLevel.WARNING
        
        self.log(
            action=action,
            success=success,
            username=username,
            ip_address=ip_address,
            error_message=error_message,
            level=level,
        )
    
    def log_authorization_failure(
        self,
        username: str,
        user_roles: list[str],
        resource: str,
        required_roles: list[str],
        ip_address: str | None = None,
    ):
        """Log authorization failure.
        
        Args:
            username: Username denied access
            user_roles: User's roles
            resource: Resource being accessed
            required_roles: Roles required for access
            ip_address: IP address of request
        """
        self.log(
            action=AuditAction.ACCESS_DENIED,
            success=False,
            username=username,
            user_roles=user_roles,
            ip_address=ip_address,
            resource=resource,
            details={"required_roles": required_roles},
            level=AuditLevel.WARNING,
        )
    
    def log_data_access(
        self,
        action: AuditAction,
        username: str,
        user_roles: list[str],
        resource: str,
        success: bool = True,
        details: dict[str, Any] | None = None,
        ip_address: str | None = None,
    ):
        """Log data access operation.
        
        Args:
            action: Type of data operation
            username: Username performing operation
            user_roles: User's roles
            resource: Resource being accessed
            success: Whether operation was successful
            details: Additional details
            ip_address: IP address of request
        """
        self.log(
            action=action,
            success=success,
            username=username,
            user_roles=user_roles,
            ip_address=ip_address,
            resource=resource,
            details=details,
            level=AuditLevel.INFO,
        )


# Global audit logger instance
audit_logger = AuditLogger()
