"""Secrets management utilities."""

import os
from pathlib import Path
from typing import Any

from app.core.logging import get_logger

logger = get_logger(__name__)


class SecretsManager:
    """Secrets manager with support for environment variables and files."""
    
    def __init__(self):
        """Initialize secrets manager."""
        self._cache: dict[str, str] = {}
    
    def get_secret(
        self,
        key: str,
        default: str | None = None,
        from_file: bool = False
    ) -> str | None:
        """Get a secret value.
        
        Secrets can be loaded from:
        1. Environment variable
        2. File (Docker secrets style)
        3. Default value
        
        Args:
            key: Secret key
            default: Default value if not found
            from_file: Look for secret in /run/secrets/{key}
            
        Returns:
            Secret value or None
        """
        # Check cache first
        if key in self._cache:
            return self._cache[key]
        
        # Try environment variable
        value = os.getenv(key)
        if value:
            self._cache[key] = value
            logger.debug(f"Secret loaded from environment: {key}")
            return value
        
        # Try file (Docker secrets or Kubernetes secrets)
        if from_file:
            secret_file = Path(f"/run/secrets/{key}")
            if secret_file.exists():
                try:
                    value = secret_file.read_text().strip()
                    self._cache[key] = value
                    logger.debug(f"Secret loaded from file: {key}")
                    return value
                except Exception as e:
                    logger.error(f"Failed to read secret file: {key}", error=str(e))
        
        # Return default
        if default is not None:
            logger.debug(f"Using default value for secret: {key}")
            return default
        
        logger.warning(f"Secret not found: {key}")
        return None
    
    def set_secret(self, key: str, value: str):
        """Set a secret value in cache.
        
        Args:
            key: Secret key
            value: Secret value
        """
        self._cache[key] = value
    
    def clear_cache(self):
        """Clear secrets cache."""
        self._cache.clear()
        logger.info("Secrets cache cleared")


# Global secrets manager
secrets = SecretsManager()


def load_secret_key() -> str:
    """Load SECRET_KEY from secure source.
    
    Priority:
    1. /run/secrets/SECRET_KEY file
    2. SECRET_KEY environment variable
    3. Generate warning if using default
    
    Returns:
        Secret key string
    """
    secret_key = secrets.get_secret("SECRET_KEY", from_file=True)
    
    if not secret_key or secret_key == "your-secret-key-change-in-production":
        logger.critical(
            "SECURITY WARNING: Using default SECRET_KEY! "
            "Set SECRET_KEY environment variable or create /run/secrets/SECRET_KEY file"
        )
        # In production, you might want to raise an exception here
        return "your-secret-key-change-in-production"
    
    return secret_key


def load_database_credentials() -> dict[str, str]:
    """Load database credentials from secure source.
    
    Returns:
        Dictionary with database credentials
    """
    return {
        "host": secrets.get_secret("DB_HOST", default="localhost", from_file=True),
        "port": secrets.get_secret("DB_PORT", default="5432", from_file=True),
        "user": secrets.get_secret("DB_USER", default="postgres", from_file=True),
        "password": secrets.get_secret("DB_PASSWORD", from_file=True),
        "database": secrets.get_secret("DB_NAME", default="import_visualizer", from_file=True),
    }


def load_api_keys() -> list[str]:
    """Load API keys from secure source.
    
    Returns:
        List of valid API keys
    """
    api_keys_str = secrets.get_secret("API_KEYS", from_file=True)
    
    if not api_keys_str:
        return []
    
    # API keys can be comma-separated
    return [key.strip() for key in api_keys_str.split(",") if key.strip()]
