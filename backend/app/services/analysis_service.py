"""Service layer for project analysis."""

import asyncio
import uuid
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from opentelemetry import trace

from app.api.models import AnalysisResult, GraphMetrics
from app.config import settings
from app.core.cache import CacheDB
from app.core.discovery import FileDiscovery
from app.core.exceptions import AnalysisError, NotFoundError, ValidationError
from app.core.graph.analyzer import GraphAnalyzer
from app.core.graph.builder import GraphBuilder
from app.core.import_graph import parse_imported_graph
from app.core.logging import get_logger
from app.core.metrics import (
    analysis_requests_total,
    analysis_duration_seconds,
    cache_hits_total,
    cache_misses_total,
    active_analyses,
    memory_cache_size,
)
from app.core.parallel_parser import ParallelParser
from app.core.trace_decorators import traced
from app.core.repository import clone_repository, remove_clone, repo_cache_id
from app.core.validation import validate_project_path

logger = get_logger(__name__)


def _normalize_file_key(path: str) -> str:
    """Normalize path for use as cache key (forward slashes, no leading slash)."""
    p = Path(path)
    parts = p.parts
    if parts and parts[0] in ("/", "\\"):
        parts = parts[1:]
    return "/".join(parts).replace("\\", "/")


def _collect_file_contents(
    clone_path: Path,
    nodes: list,
    max_files: int = 500,
    max_bytes_per_file: int = 1024 * 100,
) -> dict[str, str]:
    """Read file contents for graph nodes under clone_path (for repo View File).
    Returns dict of path_key -> content (truncated). Stores under both relative and absolute
    path so lookup works whether frontend sends node.file_path as absolute or relative.
    Skips binary/unreadable.
    """
    contents: dict[str, str] = {}
    seen: set[str] = set()
    clone_resolved = clone_path.resolve()
    for node in nodes:
        if len(contents) >= max_files:
            break
        path_str = getattr(node, "file_path", None) or getattr(node, "id", None)
        if not path_str or path_str in seen:
            continue
        try:
            path = Path(path_str)
            resolved = (clone_path / path).resolve() if not path.is_absolute() else Path(path_str).resolve()
            if not resolved.is_file():
                continue
            try:
                rel = resolved.relative_to(clone_resolved)
            except ValueError:
                continue
            rel_key = _normalize_file_key(str(rel))
            if rel_key in contents:
                continue
            seen.add(path_str)
            with open(resolved, "r", encoding="utf-8") as f:
                content = f.read(max_bytes_per_file)
            contents[rel_key] = content
            # Also store under absolute path so lookup works when frontend sends node.file_path (absolute)
            abs_key = str(resolved)
            if abs_key != rel_key:
                contents[abs_key] = content
        except (ValueError, OSError, UnicodeDecodeError):
            continue
    return contents
tracer = trace.get_tracer(__name__)


class AnalysisService:
    """Service for project analysis operations."""

    def __init__(
        self,
        cache: CacheDB,
        parallel_parser: ParallelParser | None = None,
        max_memory_cache: int = 100,
        executor: ThreadPoolExecutor | None = None,
    ):
        """Initialize analysis service.
        
        Args:
            cache: Cache database instance
            parallel_parser: Parallel parser instance (optional)
            max_memory_cache: Maximum number of analyses to keep in memory (default: 100)
            executor: Thread pool executor for CPU-bound tasks (optional)
        """
        self.cache = cache
        self.parallel_parser = parallel_parser or ParallelParser(
            max_workers=settings.MAX_WORKERS
        )
        # Thread pool for CPU-bound operations
        self.executor = executor or ThreadPoolExecutor(max_workers=settings.MAX_WORKERS)
        # LRU cache with size limit to prevent memory leaks
        self._memory_cache: OrderedDict = OrderedDict()
        self._max_memory_cache = max_memory_cache

    async def analyze_project(
        self,
        project_path: str,
        ignore_patterns: list[str] | None = None,
        extractor_backend: str | None = None,
    ) -> AnalysisResult:
        """Analyze a project and return results.

        Args:
            project_path: Path to project directory
            ignore_patterns: Patterns to ignore during file discovery
            extractor_backend: Override extractor: "python" or "go"; None uses config

        Returns:
            Analysis result with graph data and metrics

        Raises:
            ValidationError: If project path is invalid
            AnalysisError: If analysis fails
        """
        # Start tracing span
        with tracer.start_as_current_span("analyze_project") as span:
            span.set_attribute("project.path", project_path)
            span.set_attribute("ignore_patterns.count", len(ignore_patterns or []))
            
        # Start tracing span
        with tracer.start_as_current_span("analyze_project") as span:
            span.set_attribute("project.path", project_path)
            span.set_attribute("ignore_patterns.count", len(ignore_patterns or []))
            
            # Track active analyses
            active_analyses.inc()
            
            try:
                # Validate path (includes security checks)
                path = validate_project_path(project_path)
                span.set_attribute("project.validated_path", str(path))
                
                logger.info(
                    "Starting project analysis",
                    project_path=str(path),
                    ignore_patterns=ignore_patterns,
                )
                
                # Track analysis duration
                with analysis_duration_seconds.time():
                    try:
                        # Discover files (I/O-bound, run in thread pool)
                        with tracer.start_as_current_span("discover_files"):
                            loop = asyncio.get_event_loop()
                            discoverer = FileDiscovery(ignore_patterns=ignore_patterns or [])
                            files = await loop.run_in_executor(
                                self.executor,
                                discoverer.discover_files,
                                path
                            )
                            span.set_attribute("files.discovered", len(files))
                        
                        if not files:
                            logger.warning("No files found", project_path=str(path))
                            analysis_requests_total.labels(status="error").inc()
                            raise AnalysisError(
                                "No supported source files found in project",
                                details={"project_path": str(path)},
                            )
                        
                        logger.info("Files discovered", file_count=len(files))
                        
                        # Parse files in parallel (CPU-bound, run in thread pool)
                        with tracer.start_as_current_span("parse_files"):
                            all_imports, warnings = await loop.run_in_executor(
                                self.executor,
                                lambda: self.parallel_parser.parse_files(
                                    files, path, extractor_backend
                                ),
                            )
                            span.set_attribute("imports.count", len(all_imports))
                            span.set_attribute("warnings.count", len(warnings))
                        
                        logger.info(
                            "Files parsed",
                            import_count=len(all_imports),
                            warning_count=len(warnings),
                        )
                        
                        # Build dependency graph (CPU-bound, run in thread pool)
                        with tracer.start_as_current_span("build_graph"):
                            graph_builder = await loop.run_in_executor(
                                self.executor,
                                self._build_graph,
                                path,
                                all_imports
                            )
                        
                        # Analyze graph (CPU-bound, run in thread pool)
                        with tracer.start_as_current_span("analyze_graph"):
                            analyzer, metrics, pagerank, betweenness = await loop.run_in_executor(
                                self.executor,
                                self._analyze_graph,
                                graph_builder
                            )
                            span.set_attribute("graph.nodes", metrics.total_files)
                            span.set_attribute("graph.edges", metrics.total_imports)
                        
                        # Add circular dependency warnings
                        warnings = self._add_cycle_warnings(metrics, warnings, path)

                        cycle_participation = analyzer.get_cycle_participation()
                        node_depths = analyzer.get_node_depths()
                        closeness = analyzer.get_closeness_centrality()
                        eigenvector = analyzer.get_eigenvector_centrality()
                        external_ratio_map = analyzer.get_external_ratio_per_node()

                        # Create result
                        analysis_id = str(uuid.uuid4())
                        result = AnalysisResult(
                            id=analysis_id,
                            project_path=str(path),
                            nodes=graph_builder.get_nodes(
                                pagerank,
                                betweenness,
                                cycle_participation=cycle_participation,
                                node_depths=node_depths,
                                closeness_scores=closeness,
                                eigenvector_scores=eigenvector,
                                external_ratio_map=external_ratio_map,
                            ),
                            edges=graph_builder.get_edges(),
                            metrics=metrics,
                            warnings=warnings,
                        )
                        
                        # Cache result
                        self.cache.save(result)
                        self._cache_in_memory(analysis_id, (result, analyzer, graph_builder))
                        
                        # Update metrics
                        analysis_requests_total.labels(status="success").inc()
                        memory_cache_size.set(len(self._memory_cache))
                        span.set_attribute("analysis.id", analysis_id)
                        span.set_attribute("analysis.status", "success")
                        
                        logger.info(
                            "Analysis completed",
                            analysis_id=analysis_id,
                            node_count=len(result.nodes),
                            edge_count=len(result.edges),
                        )
                        
                        return result
                
                    except AnalysisError:
                        analysis_requests_total.labels(status="error").inc()
                        span.set_attribute("analysis.status", "error")
                        raise
                    except Exception as e:
                        logger.exception("Analysis failed", project_path=str(path))
                        analysis_requests_total.labels(status="error").inc()
                        span.set_attribute("analysis.status", "error")
                        span.record_exception(e)
                        raise AnalysisError(
                            "Failed to analyze project",
                            details={"error": str(e)},
                        )
            finally:
                active_analyses.dec()

    async def analyze_repository(
        self,
        repository_url: str,
        branch: str | None = None,
        ignore_patterns: list[str] | None = None,
        extractor_backend: str | None = None,
    ) -> AnalysisResult:
        """Clone a Git repository and analyze it (with cache by URL + ref).

        Same (url, branch) returns cached result when available; otherwise clones,
        analyzes, saves under a deterministic cache ID, then removes the clone.

        Args:
            repository_url: HTTPS Git URL (e.g. https://github.com/user/repo)
            branch: Branch, tag, or commit to checkout (None = default branch)
            ignore_patterns: Patterns to ignore during file discovery
            extractor_backend: Override extractor: "python" or "go"; None uses config

        Returns:
            Analysis result with graph data and metrics

        Raises:
            ValidationError: If URL invalid or clone fails
            AnalysisError: If analysis fails
        """
        from app.config import settings

        if not settings.REPOSITORY_ANALYSIS_ENABLED:
            raise ValidationError(
                "Repository analysis is disabled",
                details={"REPOSITORY_ANALYSIS_ENABLED": False},
            )

        cache_id = repo_cache_id(repository_url, branch)

        # Cache hit: return existing result (memory or SQLite)
        if cache_id in self._memory_cache:
            cache_hits_total.inc()
            self._memory_cache.move_to_end(cache_id)
            return self._memory_cache[cache_id][0]
        cached = self.cache.get(cache_id)
        if cached is not None:
            cache_hits_total.inc()
            logger.info("Repository analysis cache hit", cache_id=cache_id)
            return cached

        cache_misses_total.inc()
        clone_path: Path | None = None
        loop = asyncio.get_event_loop()

        try:
            clone_path = await loop.run_in_executor(
                self.executor,
                lambda: clone_repository(
                    repository_url,
                    branch=branch,
                ),
            )
            result = await self.analyze_project(
                project_path=str(clone_path),
                ignore_patterns=ignore_patterns,
                extractor_backend=extractor_backend,
            )
            # Cache file contents for View File (clone is removed after this)
            file_contents = await loop.run_in_executor(
                self.executor,
                lambda: _collect_file_contents(
                    clone_path,
                    result.nodes,
                    max_files=settings.REPOSITORY_FILE_PREVIEW_MAX_FILES,
                    max_bytes_per_file=settings.REPOSITORY_FILE_PREVIEW_MAX_BYTES_PER_FILE,
                ),
            )
            # Save under deterministic ID and use repo URL as project_path for display
            from app.api.models import AnalysisResult

            repo_result = AnalysisResult(
                id=cache_id,
                project_path=repository_url,
                nodes=result.nodes,
                edges=result.edges,
                metrics=result.metrics,
                warnings=result.warnings,
                file_contents=file_contents,
            )
            self.cache.save(repo_result)
            self._cache_in_memory(cache_id, (repo_result, None, None))
            logger.info(
                "Repository analysis cached",
                cache_id=cache_id,
                node_count=len(repo_result.nodes),
            )
            return repo_result
        finally:
            if clone_path is not None:
                await loop.run_in_executor(
                    self.executor,
                    lambda: remove_clone(clone_path),
                )

    def get_analysis(self, analysis_id: str) -> AnalysisResult:
        """Get cached analysis result.
        
        Args:
            analysis_id: Analysis ID
            
        Returns:
            Analysis result
            
        Raises:
            NotFoundError: If analysis not found
        """
        # Check memory cache
        if analysis_id in self._memory_cache:
            logger.debug("Analysis found in memory", analysis_id=analysis_id)
            cache_hits_total.inc()
            # Move to end (mark as recently used)
            self._memory_cache.move_to_end(analysis_id)
            return self._memory_cache[analysis_id][0]
        
        # Check SQLite cache
        result = self.cache.get(analysis_id)
        if result:
            logger.debug("Analysis found in cache", analysis_id=analysis_id)
            cache_hits_total.inc()
            return result
        
        logger.warning("Analysis not found", analysis_id=analysis_id)
        cache_misses_total.inc()
        raise NotFoundError(
            f"Analysis not found: {analysis_id}",
            details={"analysis_id": analysis_id},
        )

    def delete_analysis(self, analysis_id: str) -> None:
        """Delete cached analysis.
        
        Args:
            analysis_id: Analysis ID
            
        Raises:
            NotFoundError: If analysis not found
        """
        # Remove from memory cache
        if analysis_id in self._memory_cache:
            del self._memory_cache[analysis_id]
            memory_cache_size.set(len(self._memory_cache))
        
        # Remove from SQLite cache
        if not self.cache.delete(analysis_id):
            logger.warning("Analysis not found for deletion", analysis_id=analysis_id)
            raise NotFoundError(
                f"Analysis not found: {analysis_id}",
                details={"analysis_id": analysis_id},
            )
        
        logger.info("Analysis deleted", analysis_id=analysis_id)
    
    def _build_graph(self, project_path: Path, all_imports: list) -> GraphBuilder:
        """Build dependency graph (CPU-bound, sync method for thread pool).
        
        Args:
            project_path: Project root path
            all_imports: List of import information
            
        Returns:
            GraphBuilder instance
        """
        graph_builder = GraphBuilder(project_path)
        graph_builder.add_imports(all_imports)
        return graph_builder
    
    def _analyze_graph(
        self, graph_builder: GraphBuilder
    ) -> tuple[GraphAnalyzer, GraphMetrics, dict, dict]:
        """Analyze graph and compute metrics (CPU-bound, sync method for thread pool).
        
        Args:
            graph_builder: Graph builder instance
            
        Returns:
            Tuple of (analyzer, metrics, pagerank, betweenness)
        """
        analyzer = GraphAnalyzer(graph_builder.get_graph())
        metrics = analyzer.compute_metrics()
        pagerank = analyzer.get_pagerank_scores()
        betweenness = analyzer.get_betweenness_centrality()
        return analyzer, metrics, pagerank, betweenness

    async def import_graph_from_file(
        self, file_content: bytes, filename: str
    ) -> AnalysisResult:
        """Import an exported graph (JSON, GraphML, GEXF) and return AnalysisResult.

        Args:
            file_content: Raw file bytes
            filename: Original filename (for format detection)

        Returns:
            Analysis result (saved to cache, same shape as analyze_project)

        Raises:
            ValidationError: If format is unsupported or parse fails
        """
        graph, project_path = parse_imported_graph(file_content, filename)
        if graph.number_of_nodes() == 0 and graph.number_of_edges() == 0:
            raise ValidationError("Imported graph has no nodes or edges", details={"filename": filename})

        builder = GraphBuilder.from_graph(graph, project_path)
        loop = asyncio.get_event_loop()

        def _analyze() -> tuple[GraphAnalyzer, "GraphMetrics", dict, dict]:
            analyzer = GraphAnalyzer(graph)
            metrics = analyzer.compute_metrics()
            pagerank = analyzer.get_pagerank_scores()
            betweenness = analyzer.get_betweenness_centrality()
            return analyzer, metrics, pagerank, betweenness

        analyzer, metrics, pagerank, betweenness = await loop.run_in_executor(
            self.executor, _analyze
        )
        cycle_participation = analyzer.get_cycle_participation()
        node_depths = analyzer.get_node_depths()
        closeness = analyzer.get_closeness_centrality()
        eigenvector = analyzer.get_eigenvector_centrality()
        external_ratio_map = analyzer.get_external_ratio_per_node()
        nodes = builder.get_nodes(
            pagerank,
            betweenness,
            cycle_participation=cycle_participation,
            node_depths=node_depths,
            closeness_scores=closeness,
            eigenvector_scores=eigenvector,
            external_ratio_map=external_ratio_map,
        )
        edges = builder.get_edges()

        analysis_id = str(uuid.uuid4())
        result = AnalysisResult(
            id=analysis_id,
            project_path=project_path,
            nodes=nodes,
            edges=edges,
            metrics=metrics,
            warnings=[],
        )
        self.cache.save(result)
        self._cache_in_memory(analysis_id, (result, analyzer, builder))
        memory_cache_size.set(len(self._memory_cache))
        logger.info(
            "Graph imported",
            analysis_id=analysis_id,
            nodes=len(nodes),
            edges=len(edges),
            filename=filename,
        )
        return result

    def get_analyzer_and_builder(
        self, analysis_id: str
    ) -> tuple[GraphAnalyzer, GraphBuilder]:
        """Get analyzer and builder for an analysis.
        
        Args:
            analysis_id: Analysis ID
            
        Returns:
            Tuple of (analyzer, builder)
            
        Raises:
            NotFoundError: If analysis not found in memory cache
        """
        if analysis_id not in self._memory_cache:
            raise NotFoundError(
                f"Analysis not found in memory: {analysis_id}",
                details={"analysis_id": analysis_id},
            )
        
        _, analyzer, builder = self._memory_cache[analysis_id]
        return analyzer, builder

    def _cache_in_memory(
        self,
        analysis_id: str,
        data: tuple[AnalysisResult, GraphAnalyzer, GraphBuilder],
    ) -> None:
        """Cache result in memory with LRU eviction.
        
        Args:
            analysis_id: Analysis ID
            data: Tuple of (result, analyzer, builder)
        """
        # Remove oldest entry if at capacity
        if len(self._memory_cache) >= self._max_memory_cache:
            oldest_id = next(iter(self._memory_cache))
            del self._memory_cache[oldest_id]
            logger.debug("Evicted oldest analysis from memory", analysis_id=oldest_id)
        
        # Add new entry (will be at the end)
        self._memory_cache[analysis_id] = data
        logger.debug(
            "Cached analysis in memory",
            analysis_id=analysis_id,
            cache_size=len(self._memory_cache),
        )

    @staticmethod
    def _add_cycle_warnings(
        metrics: GraphMetrics,
        warnings: list[str],
        project_path: Path,
    ) -> list[str]:
        """Add warnings for circular dependencies.
        
        Args:
            metrics: Graph metrics
            warnings: Existing warnings
            project_path: Project path for relative paths
            
        Returns:
            Updated warnings list
        """
        if metrics.circular_dependencies:
            for cycle in metrics.circular_dependencies[:5]:  # Show first 5
                cycle_str = " → ".join(
                    [Path(node).name if "/" in node else node for node in cycle]
                )
                warnings.append(f"Circular dependency: {cycle_str}")
        
        return warnings
