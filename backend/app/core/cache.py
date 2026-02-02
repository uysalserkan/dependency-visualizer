"""SQLite-based caching for analysis results."""

import json
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from app.api.models import AnalysisResult


def _parse_row_to_result(row: tuple) -> AnalysisResult:
    """Parse (data,) row to AnalysisResult."""
    data = json.loads(row[0])
    return AnalysisResult(**data)


class CacheDB:
    """SQLite database for caching analysis results."""

    def __init__(self, db_path: str = ".cache/analysis.db"):
        """Initialize cache database.

        Args:
            db_path: Path to the SQLite database file
        """
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self):
        """Initialize database schema."""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS analysis_cache (
                    id TEXT PRIMARY KEY,
                    project_path TEXT NOT NULL,
                    created_at TIMESTAMP NOT NULL,
                    last_accessed TIMESTAMP NOT NULL,
                    data TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_project_path 
                ON analysis_cache(project_path)
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_last_accessed 
                ON analysis_cache(last_accessed)
                """
            )
            conn.commit()

    def save(self, analysis: AnalysisResult) -> None:
        """Save analysis result to cache.

        Args:
            analysis: Analysis result to cache
        """
        now = datetime.now()
        data = analysis.model_dump_json()

        with sqlite3.connect(self.db_path) as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO analysis_cache 
                (id, project_path, created_at, last_accessed, data)
                VALUES (?, ?, ?, ?, ?)
                """,
                (analysis.id, analysis.project_path, now, now, data),
            )
            conn.commit()

    def get(self, analysis_id: str) -> Optional[AnalysisResult]:
        """Retrieve analysis result from cache.

        Args:
            analysis_id: ID of the analysis to retrieve

        Returns:
            Analysis result if found and valid, None otherwise
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                """
                SELECT data, created_at FROM analysis_cache 
                WHERE id = ?
                """,
                (analysis_id,),
            )
            row = cursor.fetchone()

            if row:
                # Update last accessed time
                conn.execute(
                    """
                    UPDATE analysis_cache 
                    SET last_accessed = ? 
                    WHERE id = ?
                    """,
                    (datetime.now(), analysis_id),
                )
                conn.commit()

                # Parse and return
                data = json.loads(row[0])
                return AnalysisResult(**data)

        return None

    def get_by_project(self, project_path: str) -> Optional[AnalysisResult]:
        """Get most recent analysis for a project.

        Args:
            project_path: Path to the project

        Returns:
            Most recent analysis result if found
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                """
                SELECT data FROM analysis_cache 
                WHERE project_path = ? 
                ORDER BY created_at DESC 
                LIMIT 1
                """,
                (project_path,),
            )
            row = cursor.fetchone()

            if row:
                return _parse_row_to_result(row)

        return None

    def list_analyses(self, limit: int = 10) -> list[AnalysisResult]:
        """List most recently accessed analyses.

        Args:
            limit: Maximum number of results

        Returns:
            List of analysis results, newest first by last_accessed
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                """
                SELECT data FROM analysis_cache
                ORDER BY last_accessed DESC
                LIMIT ?
                """,
                (max(1, limit),),
            )
            rows = cursor.fetchall()
        return [_parse_row_to_result((row[0],)) for row in rows]

    def delete(self, analysis_id: str) -> bool:
        """Delete analysis from cache.

        Args:
            analysis_id: ID of the analysis to delete

        Returns:
            True if deleted, False if not found
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "DELETE FROM analysis_cache WHERE id = ?", (analysis_id,)
            )
            conn.commit()
            return cursor.rowcount > 0

    def cleanup_old(self, days: int = 7) -> int:
        """Remove old cached results.

        Args:
            days: Remove results older than this many days

        Returns:
            Number of entries removed
        """
        cutoff = datetime.now() - timedelta(days=days)

        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "DELETE FROM analysis_cache WHERE last_accessed < ?", (cutoff,)
            )
            conn.commit()
            return cursor.rowcount

    def get_stats(self) -> dict:
        """Get cache statistics.

        Returns:
            Dictionary with cache stats
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT COUNT(*) FROM analysis_cache")
            total = cursor.fetchone()[0]

            cursor = conn.execute(
                """
                SELECT COUNT(DISTINCT project_path) 
                FROM analysis_cache
                """
            )
            unique_projects = cursor.fetchone()[0]

            cursor = conn.execute(
                """
                SELECT SUM(LENGTH(data)) 
                FROM analysis_cache
                """
            )
            total_size = cursor.fetchone()[0] or 0

        return {
            "total_entries": total,
            "unique_projects": unique_projects,
            "total_size_bytes": total_size,
            "db_path": str(self.db_path),
        }


# Global cache instance
_cache_db: Optional[CacheDB] = None


def get_cache() -> CacheDB:
    """Get or create global cache instance.

    Returns:
        CacheDB instance
    """
    global _cache_db
    if _cache_db is None:
        _cache_db = CacheDB()
    return _cache_db
