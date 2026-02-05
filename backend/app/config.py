"""Application configuration management."""

from typing import Literal

from pydantic_settings import BaseSettings


ExtractorBackend = Literal["auto", "python", "go"]
MetricsLevel = Literal["light", "full"]


class Settings(BaseSettings):
    """Application settings with environment variable support."""

    # Application
    APP_NAME: str = "Dependency Visualizer API"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # API
    API_PREFIX: str = "/api"
    
    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    # File Analysis
    MAX_FILE_PREVIEW_SIZE: int = 1024 * 100  # 100KB
    PARALLEL_PARSE_THRESHOLD: int = 10
    # Extractor backend: "auto" (use Go if available), "python", or "go"
    EXTRACTOR_BACKEND: ExtractorBackend = "auto"
    # Go extractor (faster): path to extractor binary; required when EXTRACTOR_BACKEND=go
    GO_EXTRACTOR_PATH: str | None = None
    
    # Cache
    CACHE_DB_PATH: str = ".cache/analysis.db"
    CACHE_TTL_DAYS: int = 7
    CACHE_MAX_SIZE_MB: int = 500
    
    # Security
    ALLOWED_PROJECT_DIRS: list[str] | None = None  # None = allow all (dev mode)
    MAX_PROJECT_SIZE_GB: int = 10
    
    # Performance
    MAX_WORKERS: int | None = None  # None = use CPU count
    METRICS_LEVEL_DEFAULT: MetricsLevel = "full"
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_ANALYZE: str = "10/minute"  # Heavy analysis endpoint
    RATE_LIMIT_ANALYZE_REPO: str = "5/minute"  # Clone + analyze (heavier)
    RATE_LIMIT_ANALYZE_ZIP: str = "5/minute"  # Zip upload + extract + analyze
    RATE_LIMIT_EXPORT: str = "20/minute"   # Medium endpoint
    RATE_LIMIT_DEFAULT: str = "30/minute"  # Light endpoints
    RATE_LIMIT_STORAGE_URL: str | None = "memory://"
    
    # Monitoring
    METRICS_ENABLED: bool = True
    
    # Tracing
    TRACING_ENABLED: bool = True
    JAEGER_HOST: str = "localhost"
    JAEGER_PORT: int = 6831
    
    # Error Tracking
    SENTRY_DSN: str | None = None
    SENTRY_ENVIRONMENT: str = "production"
    SENTRY_TRACES_SAMPLE_RATE: float = 1.0
    
    # Celery / Background Tasks
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"
    CELERY_ENABLED: bool = False  # Disabled by default
    CACHE_CLEANUP_INTERVAL_HOURS: int = 24
    
    # Redis Cache
    REDIS_URL: str = "redis://localhost:6379/2"
    REDIS_ENABLED: bool = False  # Use in-memory cache by default
    REDIS_TTL: int = 3600  # 1 hour default TTL
    
    # Authentication & Security
    SECRET_KEY: str = "your-secret-key-change-in-production"  # MUST be changed in production!
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    AUTH_ENABLED: bool = False  # Disable auth by default for backward compatibility
    
    # API Keys (for service-to-service communication)
    API_KEYS: list[str] = []  # List of valid API keys
    
    # Security Headers
    SECURITY_HEADERS_ENABLED: bool = True
    
    # Repository analysis (online Git URL)
    REPOSITORY_ANALYSIS_ENABLED: bool = True
    # Allowed Git hosts. Empty list = allow all hosts (useful for private Git servers)
    REPOSITORY_ALLOWED_HOSTS: list[str] = [
        "github.com",
        "gitlab.com",
        "bitbucket.org",
        "gitea.com",
        "codeberg.org",
        "bitbucket.int.sahibinden.com"
    ]
    REPOSITORY_CLONE_TIMEOUT: int = 120  # seconds
    REPOSITORY_CLONE_DEPTH: int = 1  # 1 = shallow (latest commit), 0 = full history
    REPOSITORY_WORK_DIR: str = ""  # empty = system temp dir
    REPOSITORY_MAX_SIZE_MB: int = 500  # 0 = no limit; check after clone
    # File preview cache for repo analyses (so View File works without disk)
    REPOSITORY_FILE_PREVIEW_MAX_FILES: int = 500  # max files to store content for
    REPOSITORY_FILE_PREVIEW_MAX_BYTES_PER_FILE: int = 1024 * 100  # 100KB per file (same as MAX_FILE_PREVIEW_SIZE)
    REPOSITORY_FILE_PREVIEW_ENABLED: bool = True

    # ZIP analysis (upload .zip, extract to temp, analyze)
    ZIP_ANALYSIS_ENABLED: bool = True
    MAX_ZIP_SIZE_MB: int = 100  # max uploaded zip size
    MAX_ZIP_UNCOMPRESSED_MB: int = 500  # max uncompressed total (zip bomb protection)

    # Audit Logging
    AUDIT_LOG_ENABLED: bool = True
    AUDIT_LOG_PATH: str = "logs/audit.log"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Global settings instance
settings = Settings()
