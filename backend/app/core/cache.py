"""
Persistent, on-disk caching using SQLite for analysis results.
"""
import sqlite3
import json
import time
from pathlib import Path
from typing import Optional
import hashlib

from app.api.models import AnalysisResult
from app.core.discovery import FileDiscovery
from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

class CacheDB:
    """A persistent key-value store for analysis results using SQLite."""

    def __init__(self, db_path: Path | str = settings.CACHE_DB_PATH):
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._create_table()

    def _get_conn(self):
        return sqlite3.connect(self.db_path, timeout=10)

    def _create_table(self):
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS cache (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL,
                    timestamp REAL NOT NULL
                )
            """)
            conn.commit()

    def save(self, result: AnalysisResult):
        """Save an analysis result to the cache."""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                # Use result.id as the key
                key = result.id
                # Serialize the entire AnalysisResult model
                value = result.model_dump_json()
                timestamp = time.time()
                cursor.execute(
                    "REPLACE INTO cache (key, value, timestamp) VALUES (?, ?, ?)",
                    (key, value, timestamp)
                )
                conn.commit()
                logger.debug("Saved analysis to disk cache", key=key)
        except sqlite3.Error as e:
            logger.error("Failed to save to cache", error=e)

    def get(self, key: str) -> Optional[AnalysisResult]:
        """Get an analysis result from the cache."""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT value FROM cache WHERE key = ?", (key,))
                row = cursor.fetchone()
                if row:
                    logger.debug("Loaded analysis from disk cache", key=key)
                    return AnalysisResult.model_validate_json(row[0])
                return None
        except (sqlite3.Error, json.JSONDecodeError) as e:
            logger.error("Failed to get from cache", error=e)
            return None

    def delete(self, key: str) -> bool:
        """Delete an entry from the cache."""
        try:
            with self._get_conn() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM cache WHERE key = ?", (key,))
                conn.commit()
                return cursor.rowcount > 0
        except sqlite3.Error as e:
            logger.error("Failed to delete from cache", error=e)
            return False

    def cleanup_old(self, days: int) -> int:
        """Remove cache entries older than a certain number of days."""
        try:
            with self._get_conn() as conn:
                cutoff = time.time() - (days * 24 * 60 * 60)
                cursor = conn.cursor()
                cursor.execute("DELETE FROM cache WHERE timestamp < ?", (cutoff,))
                conn.commit()
                logger.info(f"Cleaned up {cursor.rowcount} old cache entries.")
                return cursor.rowcount
        except sqlite3.Error as e:
            logger.error("Failed to cleanup cache", error=e)
            return 0
            
    def get_stats(self) -> dict:
        """Get basic statistics about the cache."""
        try:
            with self._get_conn() as conn:
                count = conn.execute("SELECT count(*) FROM cache").fetchone()[0]
                size_bytes = self.db_path.stat().st_size if self.db_path.exists() else 0
                return {"entry_count": count, "size_mb": round(size_bytes / (1024*1024), 2)}
        except sqlite3.Error as e:
            logger.error("Failed to get cache stats", error=e)
            return {}

def generate_project_cache_key(project_path: Path, files: list[Path]) -> str:
    """
    Generates a deterministic cache key for a local project based on its
    file structure, names, and modification times.
    """
    try:
        if not files:
            return f"local-project-empty-{project_path.name}"

        # Create a string representation of file paths and their mtimes
        file_data = []
        for file_path in sorted(files):
            try:
                mtime = file_path.stat().st_mtime
                relative_path = file_path.relative_to(project_path)
                file_data.append(f"{relative_path}:{mtime}")
            except FileNotFoundError:
                continue
        
        # Hash the combined string
        hasher = hashlib.sha256()
        hasher.update("".join(file_data).encode('utf-8'))
        
        return f"local-project-{hasher.hexdigest()[:16]}"
    except Exception as e:
        logger.error("Failed to generate project cache key", error=e)
        # Fallback to a simple key if hashing fails
        return f"local-project-fallback-{project_path.name}-{time.time()}"
