"""Custom exceptions for the application."""


class AppError(Exception):
    """Base exception for application errors."""

    def __init__(self, message: str, details: dict | None = None):
        self.message = message
        self.details = details or {}
        super().__init__(message)


class ValidationError(AppError):
    """Validation error for input data."""
    pass


class SecurityError(AppError):
    """Security-related error."""
    pass


class ParseError(AppError):
    """Error during file parsing."""
    pass


class SyntaxParseError(ParseError):
    """Syntax error in source file."""
    pass


class AnalysisError(AppError):
    """Error during project analysis."""
    pass


class NotFoundError(AppError):
    """Resource not found error."""
    pass


class CacheError(AppError):
    """Cache operation error."""
    pass
