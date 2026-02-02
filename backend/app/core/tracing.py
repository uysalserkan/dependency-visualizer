"""OpenTelemetry distributed tracing configuration."""

from opentelemetry import trace
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.resources import Resource, SERVICE_NAME, SERVICE_VERSION
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

from app.core.logging import get_logger

logger = get_logger(__name__)


def setup_tracing(
    app,
    service_name: str = "import-visualizer-backend",
    service_version: str = "0.1.0",
    jaeger_host: str = "localhost",
    jaeger_port: int = 6831,
    enabled: bool = True,
):
    """Configure OpenTelemetry distributed tracing.
    
    Args:
        app: FastAPI application instance
        service_name: Name of the service
        service_version: Version of the service
        jaeger_host: Jaeger agent host
        jaeger_port: Jaeger agent port
        enabled: Enable/disable tracing
        
    Returns:
        TracerProvider instance
    """
    if not enabled:
        logger.info("Distributed tracing is disabled")
        return None
    
    try:
        # Create resource with service information
        resource = Resource(attributes={
            SERVICE_NAME: service_name,
            SERVICE_VERSION: service_version,
        })
        
        # Create tracer provider
        provider = TracerProvider(resource=resource)
        
        # Configure Jaeger exporter
        jaeger_exporter = JaegerExporter(
            agent_host_name=jaeger_host,
            agent_port=jaeger_port,
        )
        
        # Add span processor
        provider.add_span_processor(
            BatchSpanProcessor(jaeger_exporter)
        )
        
        # Set as global tracer provider
        trace.set_tracer_provider(provider)
        
        # Instrument FastAPI
        FastAPIInstrumentor.instrument_app(
            app,
            tracer_provider=provider,
            excluded_urls="/health,/health/live,/health/ready,/metrics"  # Don't trace health checks
        )
        
        logger.info(
            "Distributed tracing configured",
            service=service_name,
            jaeger_host=jaeger_host,
            jaeger_port=jaeger_port,
        )
        
        return provider
        
    except Exception as e:
        logger.error("Failed to configure tracing", error=str(e))
        return None


def get_tracer(name: str):
    """Get a tracer instance.
    
    Args:
        name: Tracer name (typically __name__)
        
    Returns:
        Tracer instance
    """
    return trace.get_tracer(name)
