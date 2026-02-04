"""Background tasks for asynchronous processing."""

import uuid
from pathlib import Path

from celery import Task

from app.celery_app import celery_app
from app.core.cache import CacheDB
from app.core.discovery import FileDiscovery
from app.core.exceptions import AnalysisError
from app.core.graph.analyzer import GraphAnalyzer
from app.core.graph.builder import GraphBuilder
from app.core.logging import get_logger
from app.core.parallel_parser import ParallelParser
from app.core.validation import validate_project_path
from app.services.analysis_service import (
    _enrich_nodes_with_blame,
    _enrich_nodes_with_file_stats,
)

logger = get_logger(__name__)


class AnalysisTask(Task):
    """Base task class with initialization."""
    
    _cache = None
    _parser = None
    
    @property
    def cache(self):
        if self._cache is None:
            self._cache = CacheDB()
        return self._cache
    
    @property
    def parser(self):
        if self._parser is None:
            self._parser = ParallelParser()
        return self._parser


@celery_app.task(
    base=AnalysisTask,
    bind=True,
    name="app.tasks.analysis.analyze_project",
    max_retries=3,
    default_retry_delay=60,  # 1 minute
)
def analyze_project_task(
    self,
    project_path: str,
    ignore_patterns: list[str] | None = None,
    analysis_id: str | None = None,
) -> dict:
    """Analyze a project in background.
    
    Args:
        self: Task instance
        project_path: Path to project directory
        ignore_patterns: Patterns to ignore
        analysis_id: Optional pre-generated analysis ID
        
    Returns:
        Analysis result as dictionary
        
    Raises:
        AnalysisError: If analysis fails
    """
    analysis_id = analysis_id or str(uuid.uuid4())
    
    logger.info(
        "Starting background analysis",
        analysis_id=analysis_id,
        project_path=project_path,
        task_id=self.request.id,
    )
    
    try:
        # Update task state
        self.update_state(
            state="PROGRESS",
            meta={
                "status": "validating",
                "analysis_id": analysis_id,
                "progress": 0,
            }
        )
        
        # Validate path
        path = validate_project_path(project_path)
        
        # Update state: discovering files
        self.update_state(
            state="PROGRESS",
            meta={
                "status": "discovering",
                "analysis_id": analysis_id,
                "progress": 10,
            }
        )
        
        # Discover files
        discoverer = FileDiscovery(ignore_patterns=ignore_patterns or [])
        files = discoverer.discover_files(path)
        
        if not files:
            raise AnalysisError(
                "No supported source files found",
                details={"project_path": str(path)}
            )
        
        # Update state: parsing files
        self.update_state(
            state="PROGRESS",
            meta={
                "status": "parsing",
                "analysis_id": analysis_id,
                "progress": 30,
                "files_found": len(files),
            }
        )
        
        # Parse files
        all_imports, warnings = self.parser.parse_files(files, path)
        
        # Update state: building graph
        self.update_state(
            state="PROGRESS",
            meta={
                "status": "building_graph",
                "analysis_id": analysis_id,
                "progress": 60,
                "imports_found": len(all_imports),
            }
        )
        
        # Build graph
        graph_builder = GraphBuilder(path)
        graph_builder.add_imports(all_imports)
        
        # Update state: analyzing
        self.update_state(
            state="PROGRESS",
            meta={
                "status": "analyzing",
                "analysis_id": analysis_id,
                "progress": 80,
            }
        )
        
        # Analyze graph
        analyzer = GraphAnalyzer(graph_builder.get_graph())
        metrics = analyzer.compute_metrics()
        pagerank = analyzer.get_pagerank_scores()
        betweenness = analyzer.get_betweenness_centrality()
        cycle_participation = analyzer.get_cycle_participation()
        node_depths = analyzer.get_node_depths()
        closeness = analyzer.get_closeness_centrality()
        eigenvector = analyzer.get_eigenvector_centrality()
        external_ratio_map = analyzer.get_external_ratio_per_node()

        # Create result (enrich nodes with file stats and commit hash like sync analysis)
        from app.api.models import AnalysisResult

        raw_nodes = graph_builder.get_nodes(
            pagerank,
            betweenness,
            cycle_participation=cycle_participation,
            node_depths=node_depths,
            closeness_scores=closeness,
            eigenvector_scores=eigenvector,
            external_ratio_map=external_ratio_map,
        )
        nodes = _enrich_nodes_with_file_stats(path, raw_nodes)
        nodes = _enrich_nodes_with_blame(path, nodes)
        result = AnalysisResult(
            id=analysis_id,
            project_path=str(path),
            nodes=nodes,
            edges=graph_builder.get_edges(),
            metrics=metrics,
            warnings=warnings,
        )
        
        # Cache result
        self.cache.save(result)
        
        logger.info(
            "Background analysis completed",
            analysis_id=analysis_id,
            nodes=len(result.nodes),
            edges=len(result.edges),
        )
        
        # Return result as dict
        return result.model_dump()
        
    except Exception as e:
        logger.exception(
            "Background analysis failed",
            analysis_id=analysis_id,
            error=str(e),
        )
        # Retry on failure
        raise self.retry(exc=e)


@celery_app.task(name="app.tasks.maintenance.cleanup_cache")
def cleanup_cache_task(max_age_days: int = 7):
    """Clean up old cached analyses.
    
    Args:
        max_age_days: Maximum age in days
        
    Returns:
        Number of items cleaned
    """
    logger.info("Starting cache cleanup", max_age_days=max_age_days)
    
    cache = CacheDB()
    deleted = cache.cleanup(max_age_days=max_age_days)
    
    logger.info("Cache cleanup completed", deleted=deleted)
    return deleted


@celery_app.task(name="app.tasks.maintenance.health_check")
def health_check_task():
    """Background health check task.
    
    Returns:
        Health status
    """
    return {
        "status": "healthy",
        "worker": "online",
        "queue": "processing",
    }
