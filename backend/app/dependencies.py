"""FastAPI dependency injection providers."""

from functools import lru_cache

from fastapi import Depends

from app.config import settings
from app.core.cache import CacheDB
from app.core.language_detector import LanguageDetector
from app.core.parallel_parser import ParallelParser
from app.core.plugins import PluginManager
from app.services.analysis_service import AnalysisService


@lru_cache()
def get_cache_db() -> CacheDB:
    """Get or create cache database instance.
    
    Returns:
        CacheDB singleton instance
    """
    return CacheDB(db_path=settings.CACHE_DB_PATH)


@lru_cache()
def get_plugin_manager() -> PluginManager:
    """Get or create plugin manager instance.
    
    Returns:
        PluginManager singleton instance
    """
    return PluginManager()


def get_parallel_parser() -> ParallelParser:
    """Get parallel parser instance.
    
    Returns:
        ParallelParser instance
    """
    return ParallelParser(max_workers=settings.MAX_WORKERS)


def get_analysis_service(
    cache: CacheDB = Depends(get_cache_db),
) -> AnalysisService:
    """Get analysis service instance with dependency injection.
    
    Args:
        cache: Cache database (injected via FastAPI)
        
    Returns:
        AnalysisService instance
    """
    return AnalysisService(cache=cache)


def get_language_detector() -> LanguageDetector:
    """Get language detector instance.
    
    Returns:
        LanguageDetector instance
    """
    return LanguageDetector()
