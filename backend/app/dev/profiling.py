"""Performance profiling utilities."""

import io
from pathlib import Path

from app.core.logging import get_logger

logger = get_logger(__name__)

# Only import profiling libraries if in dev mode
try:
    from pyinstrument import Profiler
    PROFILING_AVAILABLE = True
except ImportError:
    PROFILING_AVAILABLE = False
    logger.warning("Profiling libraries not available. Install with: pip install pyinstrument")


class PerformanceProfiler:
    """Context manager for performance profiling."""
    
    def __init__(self, session_id: str = "default", interval: float = 0.001):
        """Initialize profiler.
        
        Args:
            session_id: Identifier for this profiling session
            interval: Sampling interval in seconds (default: 1ms)
        """
        if not PROFILING_AVAILABLE:
            raise ImportError("Profiling not available. Install pyinstrument: pip install pyinstrument")
        
        self.session_id = session_id
        self.interval = interval
        self.profiler = None
        self.output = None
    
    def __enter__(self):
        """Start profiling."""
        self.profiler = Profiler(interval=self.interval)
        self.profiler.start()
        logger.info("Started profiling", session_id=self.session_id)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Stop profiling and save results."""
        self.profiler.stop()
        logger.info("Stopped profiling", session_id=self.session_id)
        
        # Generate output
        self.output = self.profiler.output_text(unicode=True, color=False)
        
        # Optionally save to file
        if hasattr(self, 'save_path') and self.save_path:
            self.save_to_file(self.save_path)
    
    def save_to_file(self, path: Path | str):
        """Save profiling output to file.
        
        Args:
            path: File path to save output
        """
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(path, 'w') as f:
            f.write(self.output)
        
        logger.info("Saved profiling output", path=str(path))
    
    def get_html(self) -> str:
        """Get HTML profiling output.
        
        Returns:
            HTML string
        """
        return self.profiler.output_html()
    
    def get_text(self) -> str:
        """Get text profiling output.
        
        Returns:
            Text string
        """
        return self.output or self.profiler.output_text(unicode=True, color=False)


def profile_endpoint(func):
    """Decorator to profile an endpoint.
    
    Usage:
        @router.get("/my-endpoint")
        @profile_endpoint
        async def my_endpoint():
            ...
    """
    from functools import wraps
    
    @wraps(func)
    async def wrapper(*args, **kwargs):
        if not PROFILING_AVAILABLE:
            return await func(*args, **kwargs)
        
        with PerformanceProfiler(session_id=func.__name__) as profiler:
            result = await func(*args, **kwargs)
        
        # Log profiling summary
        logger.info(
            "Endpoint profiling complete",
            endpoint=func.__name__,
            profile_length=len(profiler.output),
        )
        
        return result
    
    return wrapper
