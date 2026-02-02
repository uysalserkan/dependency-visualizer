"""Redis-based distributed cache."""

import json
from typing import Any

import redis
from redis.exceptions import RedisError

from app.api.models import AnalysisResult
from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class RedisCache:
    """Redis-based cache for analysis results."""
    
    def __init__(self, redis_url: str | None = None, ttl: int | None = None):
        """Initialize Redis cache.
        
        Args:
            redis_url: Redis connection URL
            ttl: Time to live in seconds
        """
        self.redis_url = redis_url or settings.REDIS_URL
        self.ttl = ttl or settings.REDIS_TTL
        self._client = None
        
        try:
            self._client = redis.from_url(
                self.redis_url,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5,
            )
            # Test connection
            self._client.ping()
            logger.info("Redis cache initialized", url=self.redis_url)
        except RedisError as e:
            logger.error("Failed to connect to Redis", error=str(e))
            self._client = None
    
    @property
    def is_available(self) -> bool:
        """Check if Redis is available.
        
        Returns:
            True if connected
        """
        if not self._client:
            return False
        
        try:
            self._client.ping()
            return True
        except RedisError:
            return False
    
    def save(self, result: AnalysisResult) -> bool:
        """Save analysis result to Redis.
        
        Args:
            result: Analysis result to cache
            
        Returns:
            True if saved successfully
        """
        if not self.is_available:
            logger.warning("Redis not available, skipping cache save")
            return False
        
        try:
            key = f"analysis:{result.id}"
            data = result.model_dump_json()
            
            self._client.setex(key, self.ttl, data)
            
            logger.debug("Saved to Redis cache", analysis_id=result.id)
            return True
            
        except RedisError as e:
            logger.error("Failed to save to Redis", error=str(e))
            return False
    
    def get(self, analysis_id: str) -> AnalysisResult | None:
        """Get analysis result from Redis.
        
        Args:
            analysis_id: Analysis ID
            
        Returns:
            Analysis result or None
        """
        if not self.is_available:
            return None
        
        try:
            key = f"analysis:{analysis_id}"
            data = self._client.get(key)
            
            if data:
                logger.debug("Retrieved from Redis cache", analysis_id=analysis_id)
                return AnalysisResult.model_validate_json(data)
            
            return None
            
        except RedisError as e:
            logger.error("Failed to get from Redis", error=str(e))
            return None
    
    def delete(self, analysis_id: str) -> bool:
        """Delete analysis from Redis.
        
        Args:
            analysis_id: Analysis ID
            
        Returns:
            True if deleted
        """
        if not self.is_available:
            return False
        
        try:
            key = f"analysis:{analysis_id}"
            deleted = self._client.delete(key)
            
            logger.debug("Deleted from Redis cache", analysis_id=analysis_id)
            return bool(deleted)
            
        except RedisError as e:
            logger.error("Failed to delete from Redis", error=str(e))
            return False
    
    def exists(self, analysis_id: str) -> bool:
        """Check if analysis exists in Redis.
        
        Args:
            analysis_id: Analysis ID
            
        Returns:
            True if exists
        """
        if not self.is_available:
            return False
        
        try:
            key = f"analysis:{analysis_id}"
            return bool(self._client.exists(key))
        except RedisError:
            return False
    
    def get_stats(self) -> dict[str, Any]:
        """Get cache statistics.
        
        Returns:
            Cache statistics
        """
        if not self.is_available:
            return {"status": "unavailable"}
        
        try:
            info = self._client.info()
            return {
                "status": "healthy",
                "connected_clients": info.get("connected_clients", 0),
                "used_memory": info.get("used_memory_human", "0B"),
                "total_keys": self._client.dbsize(),
                "hit_rate": info.get("keyspace_hits", 0) / max(
                    info.get("keyspace_hits", 0) + info.get("keyspace_misses", 1), 1
                ),
            }
        except RedisError as e:
            logger.error("Failed to get Redis stats", error=str(e))
            return {"status": "error", "error": str(e)}
    
    def clear_all(self) -> int:
        """Clear all analysis results from Redis.
        
        Returns:
            Number of keys deleted
        """
        if not self.is_available:
            return 0
        
        try:
            # Find all analysis keys
            keys = list(self._client.scan_iter("analysis:*"))
            
            if keys:
                deleted = self._client.delete(*keys)
                logger.info("Cleared Redis cache", deleted=deleted)
                return deleted
            
            return 0
            
        except RedisError as e:
            logger.error("Failed to clear Redis cache", error=str(e))
            return 0
