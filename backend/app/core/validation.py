"""Input validation utilities."""

import re
from pathlib import Path

from app.config import settings
from app.core.exceptions import SecurityError, ValidationError
from app.core.logging import get_logger

logger = get_logger(__name__)

# ReDoS protection: Maximum complexity for regex patterns
MAX_PATTERN_LENGTH = 200
MAX_REPETITION_DEPTH = 3


def validate_ignore_pattern(pattern: str) -> bool:
    """Validate ignore pattern to prevent ReDoS attacks.
    
    Args:
        pattern: Glob pattern to validate
        
    Returns:
        True if pattern is safe
        
    Raises:
        ValidationError: If pattern is potentially dangerous
    """
    # Check length
    if len(pattern) > MAX_PATTERN_LENGTH:
        raise ValidationError(
            f"Pattern too long (max {MAX_PATTERN_LENGTH} characters)",
            details={"pattern_length": len(pattern)},
        )
    
    # Check for excessive nesting of repetition operators
    repetition_chars = "*+{}"
    consecutive_reps = 0
    max_consecutive = 0
    
    for char in pattern:
        if char in repetition_chars:
            consecutive_reps += 1
            max_consecutive = max(max_consecutive, consecutive_reps)
        else:
            consecutive_reps = 0
    
    if max_consecutive > MAX_REPETITION_DEPTH:
        raise ValidationError(
            "Pattern contains excessive repetition operators",
            details={"pattern": pattern},
        )
    
    # Check for common ReDoS patterns
    dangerous_patterns = [
        r"\(.*\)\*",  # (.*)*
        r"\(.*\)\+",  # (.*)+
        r"\(.*\)\{", # (.*){}
        r"(\.\*){2,}",  # .*.*
    ]
    
    for dangerous in dangerous_patterns:
        if re.search(dangerous, pattern):
            raise ValidationError(
                "Pattern contains potentially dangerous regex construct",
                details={"pattern": pattern},
            )
    
    return True


def sanitize_ignore_patterns(patterns: list[str] | None) -> list[str]:
    """Sanitize and validate ignore patterns.
    
    Args:
        patterns: List of glob patterns
        
    Returns:
        Validated list of patterns
        
    Raises:
        ValidationError: If any pattern is invalid
    """
    if not patterns:
        return []
    
    if not isinstance(patterns, list):
        raise ValidationError("ignore_patterns must be a list")
    
    if len(patterns) > 100:
        raise ValidationError("Too many ignore patterns (max 100)")
    
    sanitized = []
    for pattern in patterns:
        if not isinstance(pattern, str):
            raise ValidationError(f"Invalid pattern type: {type(pattern)}")
        
        # Trim whitespace
        pattern = pattern.strip()
        
        if not pattern:
            continue
        
        # Validate pattern
        validate_ignore_pattern(pattern)
        sanitized.append(pattern)
    
    return sanitized


def validate_project_path(path_str: str) -> Path:
    """Validate and sanitize project path.
    
    Args:
        path_str: Path string to validate
        
    Returns:
        Validated Path object
        
    Raises:
        ValidationError: If path is invalid
        SecurityError: If path is not allowed
    """
    try:
        path = Path(path_str).resolve()
    except Exception as e:
        logger.warning("Invalid path format", path=path_str, error=str(e))
        raise ValidationError(f"Invalid path format: {path_str}")
    
    # Check if path exists
    if not path.exists():
        logger.warning("Path does not exist", path=str(path))
        raise ValidationError(f"Path does not exist: {path}")
    
    # Check if path is a directory
    if not path.is_dir():
        logger.warning("Path is not a directory", path=str(path))
        raise ValidationError(f"Path is not a directory: {path}")
    
    # Security: Check allowed directories if configured
    if settings.ALLOWED_PROJECT_DIRS:
        allowed_dirs = [Path(d).resolve() for d in settings.ALLOWED_PROJECT_DIRS]
        if not any(path.is_relative_to(allowed) for allowed in allowed_dirs):
            logger.error(
                "Path not in allowed directories",
                path=str(path),
                allowed=settings.ALLOWED_PROJECT_DIRS,
            )
            raise SecurityError(
                "Path not in allowed directories",
                details={"path": str(path)},
            )
    
    # Check project size (rough estimate)
    try:
        total_size = sum(f.stat().st_size for f in path.rglob("*") if f.is_file())
        max_size = settings.MAX_PROJECT_SIZE_GB * 1024 * 1024 * 1024
        
        if total_size > max_size:
            logger.warning(
                "Project too large",
                path=str(path),
                size_gb=total_size / (1024**3),
                max_gb=settings.MAX_PROJECT_SIZE_GB,
            )
            raise ValidationError(
                f"Project size exceeds limit of {settings.MAX_PROJECT_SIZE_GB}GB"
            )
    except Exception as e:
        # Don't fail validation if size check fails
        logger.warning("Could not check project size", path=str(path), error=str(e))
    
    logger.debug("Path validated", path=str(path))
    return path


def sanitize_file_path(file_path: str, project_root: Path) -> Path:
    """Sanitize and validate file path within project.

    Args:
        file_path: File path to sanitize (absolute or relative to project_root)
        project_root: Project root directory

    Returns:
        Validated Path object

    Raises:
        SecurityError: If path is outside project root
    """
    try:
        path = Path(file_path)
        # Resolve relative paths against project root so they work from any cwd
        resolved = (project_root / path).resolve() if not path.is_absolute() else path.resolve()
    except Exception as e:
        raise ValidationError(f"Invalid file path: {file_path}") from e

    # Security: Ensure file is within project root
    if not resolved.is_relative_to(project_root):
        logger.error(
            "File path outside project root",
            file_path=str(resolved),
            project_root=str(project_root),
        )
        raise SecurityError(
            "File path must be within project directory",
            details={"file_path": file_path},
        )
    
    return resolved
