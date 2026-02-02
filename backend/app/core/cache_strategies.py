"""Advanced caching strategies using aiocache."""

from typing import Any, Optional
from functools import wraps

from aiocache import Cache, cached
from aiocache.serializers import JsonSerializer

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


# Configure cache backends
memory_cache = Cache(Cache.MEMORY, serializer=JsonSerializer())

if settings.REDIS_ENABLED:
    redis_cache = Cache(
        Cache.REDIS,
        endpoint=settings.REDIS_URL.split("://")[1].split("/")[0],
        port=int(settings.REDIS_URL.split(":")[-1].split("/")[0]) if ":" in settings.REDIS_URL else 6379,
        serializer=JsonSerializer(),
    )
else:
    redis_cache = memory_cache


class CacheStrategy:
    """Advanced caching strategies."""
    
    @staticmethod
    def cache_aside(
        ttl: int = 3600,
        key_prefix: str = "",
        use_redis: bool = True,
    ):
        """Cache-aside pattern decorator.
        
        Args:
            ttl: Time to live in seconds
            key_prefix: Key prefix for namespacing
            use_redis: Use Redis if available, else memory
            
        Returns:
            Decorator function
        """
        cache_backend = redis_cache if (use_redis and settings.REDIS_ENABLED) else memory_cache
        
        def decorator(func):
            @cached(
                ttl=ttl,
                key_builder=lambda f, *args, **kwargs: f"{key_prefix}:{func.__name__}:{args}:{kwargs}",
                cache=cache_backend,
            )
            @wraps(func)
            async def wrapper(*args, **kwargs):
                logger.debug(
                    "Cache miss, executing function",
                    function=func.__name__,
                    backend="redis" if use_redis and settings.REDIS_ENABLED else "memory",
                )
                return await func(*args, **kwargs)
            
            return wrapper
        
        return decorator
    
    @staticmethod
    async def get_or_compute(
        key: str,
        compute_fn,
        ttl: int = 3600,
        use_redis: bool = True,
    ) -> Any:
        """Get from cache or compute and cache.
        
        Args:
            key: Cache key
            compute_fn: Function to compute value
            ttl: Time to live
            use_redis: Use Redis if available
            
        Returns:
            Cached or computed value
        """
        cache_backend = redis_cache if (use_redis and settings.REDIS_ENABLED) else memory_cache
        
        # Try to get from cache
        value = await cache_backend.get(key)
        
        if value is not None:
            logger.debug("Cache hit", key=key)
            return value
        
        # Cache miss, compute value
        logger.debug("Cache miss, computing", key=key)
        value = await compute_fn()
        
        # Store in cache
        await cache_backend.set(key, value, ttl=ttl)
        
        return value
    
    @staticmethod
    async def invalidate(key: str, use_redis: bool = True):
        """Invalidate cache entry.
        
        Args:
            key: Cache key
            use_redis: Use Redis if available
        """
        cache_backend = redis_cache if (use_redis and settings.REDIS_ENABLED) else memory_cache
        await cache_backend.delete(key)
        logger.debug("Cache invalidated", key=key)
    
    @staticmethod
    async def invalidate_pattern(pattern: str, use_redis: bool = True):
        """Invalidate all keys matching pattern.
        
        Args:
            pattern: Key pattern (e.g., "analysis:*")
            use_redis: Use Redis if available
        """
        # Only Redis supports pattern deletion
        if not (use_redis and settings.REDIS_ENABLED):
            logger.warning("Pattern deletion only supported with Redis")
            return
        
        # This requires direct Redis access
        from redis import Redis
        
        try:
            redis_url = settings.REDIS_URL.replace("redis://", "")
            host, port_db = redis_url.split(":")
            port, db = port_db.split("/")
            
            client = Redis(host=host, port=int(port), db=int(db), decode_responses=True)
            
            # Find matching keys
            keys = list(client.scan_iter(pattern))
            
            if keys:
                client.delete(*keys)
                logger.info("Cache pattern invalidated", pattern=pattern, count=len(keys))
        except Exception as e:
            logger.error("Failed to invalidate pattern", pattern=pattern, error=str(e))
    
    @staticmethod
    async def get_stats(use_redis: bool = True) -> dict[str, Any]:
        """Get cache statistics.
        
        Args:
            use_redis: Use Redis if available
            
        Returns:
            Cache statistics
        """
        cache_backend = redis_cache if (use_redis and settings.REDIS_ENABLED) else memory_cache
        
        # aiocache doesn't provide built-in stats, return basic info
        return {
            "backend": "redis" if (use_redis and settings.REDIS_ENABLED) else "memory",
            "enabled": True,
        }


# Pre-configured decorators
def cache_analysis(ttl: int = 3600):
    """Cache analysis results.
    
    Args:
        ttl: Time to live in seconds
        
    Returns:
        Decorator
    """
    return CacheStrategy.cache_aside(ttl=ttl, key_prefix="analysis", use_redis=True)


def cache_metrics(ttl: int = 1800):
    """Cache metrics computation.
    
    Args:
        ttl: Time to live in seconds
        
    Returns:
        Decorator
    """
    return CacheStrategy.cache_aside(ttl=ttl, key_prefix="metrics", use_redis=True)


def cache_graph(ttl: int = 3600):
    """Cache graph data.
    
    Args:
        ttl: Time to live in seconds
        
    Returns:
        Decorator
    """
    return CacheStrategy.cache_aside(ttl=ttl, key_prefix="graph", use_redis=True)


# Multi-level caching
class MultiLevelCache:
    """Multi-level cache (L1: Memory, L2: Redis)."""
    
    def __init__(self):
        """Initialize multi-level cache."""
        self.l1_cache = memory_cache
        self.l2_cache = redis_cache if settings.REDIS_ENABLED else None
    
    async def get(self, key: str) -> Optional[Any]:
        """Get from cache (L1 first, then L2).
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None
        """
        # Try L1 (memory)
        value = await self.l1_cache.get(key)
        if value is not None:
            logger.debug("L1 cache hit", key=key)
            return value
        
        # Try L2 (Redis)
        if self.l2_cache:
            value = await self.l2_cache.get(key)
            if value is not None:
                logger.debug("L2 cache hit", key=key)
                # Promote to L1
                await self.l1_cache.set(key, value, ttl=300)  # 5 min in L1
                return value
        
        logger.debug("Cache miss (all levels)", key=key)
        return None
    
    async def set(self, key: str, value: Any, ttl: int = 3600):
        """Set in both cache levels.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds
        """
        # Set in L1 with shorter TTL
        await self.l1_cache.set(key, value, ttl=min(ttl, 300))
        
        # Set in L2 with full TTL
        if self.l2_cache:
            await self.l2_cache.set(key, value, ttl=ttl)
    
    async def delete(self, key: str):
        """Delete from both cache levels.
        
        Args:
            key: Cache key
        """
        await self.l1_cache.delete(key)
        if self.l2_cache:
            await self.l2_cache.delete(key)


# Global multi-level cache instance
multi_cache = MultiLevelCache()
