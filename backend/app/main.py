"""FastAPI application entry point."""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

from app.api.error_handlers import register_error_handlers
from app.api.routes import router
from app.api.comparison import router as comparison_router
from app.api.preview import router as preview_router
from app.auth.routes import router as auth_router
from app.config import settings
from app.core.logging import configure_logging, get_logger
from app.core.metrics import setup_metrics
from app.core.tracing import setup_tracing
from app.middleware.rate_limiter import get_limiter, rate_limit_exceeded_handler
from app.middleware.request_id import RequestIDMiddleware
from app.middleware.security import SecurityHeadersMiddleware
from app.websocket.routes import router as ws_router
from app.graphql.schema import graphql_router

# Configure logging
configure_logging(debug=settings.DEBUG)

logger = get_logger(__name__)

# Initialize Sentry if configured
if settings.SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.starlette import StarletteIntegration
    
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.SENTRY_ENVIRONMENT,
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
        integrations=[
            StarletteIntegration(transaction_style="endpoint"),
            FastApiIntegration(transaction_style="endpoint"),
        ],
        release=f"dependency-visualizer@{settings.APP_VERSION}",
    )
    logger.info("Sentry error tracking initialized", environment=settings.SENTRY_ENVIRONMENT)

# Initialize rate limiter
limiter = get_limiter()

app = FastAPI(
    title=settings.APP_NAME,
    description="Analyze and visualize Python, JavaScript, and TypeScript import dependencies",
    version=settings.APP_VERSION,
)

# Add rate limiter state
app.state.limiter = limiter

# Setup Prometheus metrics
if settings.METRICS_ENABLED:
    setup_metrics(app, app_name=settings.APP_NAME, app_version=settings.APP_VERSION)

# Setup OpenTelemetry tracing
if settings.TRACING_ENABLED:
    setup_tracing(
        app,
        service_name=settings.APP_NAME.lower().replace(" ", "-"),
        service_version=settings.APP_VERSION,
        jaeger_host=settings.JAEGER_HOST,
        jaeger_port=settings.JAEGER_PORT,
        enabled=settings.TRACING_ENABLED,
    )

# Register error handlers
register_error_handlers(app)
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Security headers middleware (before CORS)
if settings.SECURITY_HEADERS_ENABLED:
    app.add_middleware(SecurityHeadersMiddleware)

# Request ID middleware (first, so it's available in all handlers)
app.add_middleware(RequestIDMiddleware)

# CORS middleware - Tightened for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # Explicit methods
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],  # Explicit headers
    max_age=3600,  # Cache preflight requests for 1 hour
)


# Include API routers
app.include_router(router, prefix=settings.API_PREFIX)
app.include_router(comparison_router, prefix=settings.API_PREFIX)
app.include_router(preview_router, prefix=settings.API_PREFIX)
app.include_router(ws_router, prefix=settings.API_PREFIX)

# Include authentication router (if auth is enabled)
if settings.AUTH_ENABLED:
    app.include_router(auth_router, prefix=settings.API_PREFIX)
    logger.info("Authentication enabled")

# Include GraphQL router
app.include_router(graphql_router, prefix=settings.API_PREFIX, include_in_schema=True)
logger.info("GraphQL endpoint enabled", path=f"{settings.API_PREFIX}/graphql")


@app.get("/health")
async def health_check():
    """Basic health check endpoint (liveness probe).
    
    Returns 200 if the application is running.
    """
    return {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "service": "dependency-visualizer-api",
    }


@app.get("/health/live")
async def liveness_probe():
    """Kubernetes liveness probe.
    
    Returns 200 if the application process is alive.
    """
    return {"status": "alive"}


@app.get("/health/ready")
async def readiness_probe():
    """Kubernetes readiness probe.
    
    Checks if the application is ready to serve traffic.
    Returns 200 if all dependencies are healthy, 503 otherwise.
    """
    from fastapi import Response
    from app.core.health import run_health_checks
    
    results = await run_health_checks()
    
    # Return 503 if any check failed
    if results["status"] != "healthy":
        return Response(
            content=str(results),
            status_code=503,
            media_type="application/json",
        )
    
    return {
        "status": "ready",
        "version": settings.APP_VERSION,
        "checks": results,
    }


@app.on_event("startup")
async def startup_event():
    """Initialize application on startup."""
    logger.info(
        "Application starting",
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        debug=settings.DEBUG,
    )


# Development endpoints (only in DEBUG mode)
if settings.DEBUG:
    from fastapi import HTTPException
    from fastapi.responses import HTMLResponse, PlainTextResponse
    
    @app.get("/dev/profile", include_in_schema=False)
    async def dev_profile_info():
        """Get profiling information and instructions."""
        try:
            from app.dev.profiling import PROFILING_AVAILABLE
        except ImportError:
            PROFILING_AVAILABLE = False
        
        info = {
            "profiling_available": PROFILING_AVAILABLE,
            "message": "Profiling tools are available" if PROFILING_AVAILABLE else "Install profiling tools: pip install pyinstrument memray",
            "usage": {
                "decorator": "Use @profile_endpoint decorator on route handlers",
                "manual": "Use PerformanceProfiler context manager in code",
            },
            "endpoints": {
                "/dev/profile": "This endpoint",
                "/dev/sentry-test": "Test Sentry error tracking",
            },
        }
        
        return info
    
    @app.get("/dev/sentry-test", include_in_schema=False)
    async def dev_sentry_test():
        """Test Sentry error tracking."""
        if not settings.SENTRY_DSN:
            return {
                "error": "Sentry not configured",
                "message": "Set SENTRY_DSN environment variable to enable error tracking",
            }
        
        # Trigger a test error
        try:
            1 / 0
        except ZeroDivisionError as e:
            logger.error("Test error for Sentry", error=str(e))
            raise HTTPException(status_code=500, detail="Test error sent to Sentry")
    
    logger.info("Development endpoints enabled", debug=True)
