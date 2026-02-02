"""Circuit breaker pattern for resilience."""

from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Callable

from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.core.logging import get_logger

logger = get_logger(__name__)


class CircuitState(str, Enum):
    """Circuit breaker states."""
    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Circuit is open, failing fast
    HALF_OPEN = "half_open"  # Testing if service recovered


class CircuitBreakerError(Exception):
    """Circuit breaker is open."""
    pass


class CircuitBreaker:
    """Circuit breaker pattern implementation."""
    
    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: type[Exception] = Exception,
    ):
        """Initialize circuit breaker.
        
        Args:
            name: Circuit breaker name
            failure_threshold: Number of failures before opening circuit
            recovery_timeout: Seconds before attempting recovery
            expected_exception: Exception type to catch
        """
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._last_failure_time: datetime | None = None
        self._success_count = 0
    
    @property
    def state(self) -> CircuitState:
        """Get current state.
        
        Returns:
            Current circuit state
        """
        # Check if we should try to recover
        if self._state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self._state = CircuitState.HALF_OPEN
                logger.info(
                    "Circuit breaker entering half-open state",
                    name=self.name,
                )
        
        return self._state
    
    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt reset.
        
        Returns:
            True if should attempt reset
        """
        if not self._last_failure_time:
            return False
        
        elapsed = datetime.utcnow() - self._last_failure_time
        return elapsed.total_seconds() >= self.recovery_timeout
    
    def call(self, func: Callable, *args, **kwargs) -> Any:
        """Call function through circuit breaker.
        
        Args:
            func: Function to call
            *args: Function arguments
            **kwargs: Function keyword arguments
            
        Returns:
            Function result
            
        Raises:
            CircuitBreakerError: If circuit is open
        """
        if self.state == CircuitState.OPEN:
            logger.warning(
                "Circuit breaker is open, failing fast",
                name=self.name,
                failures=self._failure_count,
            )
            raise CircuitBreakerError(
                f"Circuit breaker '{self.name}' is open"
            )
        
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except self.expected_exception as e:
            self._on_failure()
            raise
    
    def _on_success(self):
        """Handle successful call."""
        self._failure_count = 0
        
        if self._state == CircuitState.HALF_OPEN:
            self._success_count += 1
            
            # After successful call in half-open, close the circuit
            if self._success_count >= 1:
                self._state = CircuitState.CLOSED
                self._success_count = 0
                logger.info(
                    "Circuit breaker closed after recovery",
                    name=self.name,
                )
    
    def _on_failure(self):
        """Handle failed call."""
        self._failure_count += 1
        self._last_failure_time = datetime.utcnow()
        
        if self._state == CircuitState.HALF_OPEN:
            # Failed during recovery, reopen circuit
            self._state = CircuitState.OPEN
            self._success_count = 0
            logger.warning(
                "Circuit breaker reopened after failed recovery",
                name=self.name,
            )
        elif self._failure_count >= self.failure_threshold:
            # Too many failures, open circuit
            self._state = CircuitState.OPEN
            logger.error(
                "Circuit breaker opened due to failures",
                name=self.name,
                failures=self._failure_count,
                threshold=self.failure_threshold,
            )
    
    def reset(self):
        """Manually reset circuit breaker."""
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._success_count = 0
        self._last_failure_time = None
        logger.info("Circuit breaker manually reset", name=self.name)
    
    def get_stats(self) -> dict[str, Any]:
        """Get circuit breaker statistics.
        
        Returns:
            Statistics dictionary
        """
        return {
            "name": self.name,
            "state": self.state.value,
            "failure_count": self._failure_count,
            "failure_threshold": self.failure_threshold,
            "last_failure": self._last_failure_time.isoformat() if self._last_failure_time else None,
            "recovery_timeout": self.recovery_timeout,
        }


# Global circuit breakers
_circuit_breakers: dict[str, CircuitBreaker] = {}


def get_circuit_breaker(
    name: str,
    failure_threshold: int = 5,
    recovery_timeout: int = 60,
) -> CircuitBreaker:
    """Get or create a circuit breaker.
    
    Args:
        name: Circuit breaker name
        failure_threshold: Failures before opening
        recovery_timeout: Recovery timeout in seconds
        
    Returns:
        Circuit breaker instance
    """
    if name not in _circuit_breakers:
        _circuit_breakers[name] = CircuitBreaker(
            name=name,
            failure_threshold=failure_threshold,
            recovery_timeout=recovery_timeout,
        )
    
    return _circuit_breakers[name]


def with_circuit_breaker(
    name: str,
    failure_threshold: int = 5,
    recovery_timeout: int = 60,
):
    """Decorator to protect function with circuit breaker.
    
    Args:
        name: Circuit breaker name
        failure_threshold: Failures before opening
        recovery_timeout: Recovery timeout in seconds
        
    Usage:
        @with_circuit_breaker("redis", failure_threshold=3)
        def call_redis():
            ...
    """
    def decorator(func: Callable) -> Callable:
        breaker = get_circuit_breaker(name, failure_threshold, recovery_timeout)
        
        def wrapper(*args, **kwargs):
            return breaker.call(func, *args, **kwargs)
        
        wrapper.__name__ = func.__name__
        wrapper.__doc__ = func.__doc__
        return wrapper
    
    return decorator


# Pre-configured circuit breakers
cache_circuit_breaker = get_circuit_breaker("cache", failure_threshold=3, recovery_timeout=30)
redis_circuit_breaker = get_circuit_breaker("redis", failure_threshold=5, recovery_timeout=60)
