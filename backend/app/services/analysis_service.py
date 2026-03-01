"""Service layer for project analysis."""

import asyncio
import shutil
import uuid
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Optional

from opentelemetry import trace

from app.api.models import AnalysisResult, GraphMetrics, Node
from app.config import settings
from app.core.cache import CacheDB, generate_project_cache_key
from app.core.discovery import FileDiscovery
from app.core.exceptions import AnalysisError, NotFoundError, ValidationError
from app.core.git_blame import get_file_blame as get_blame
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
from app.core.repository import clone_repository, remove_clone, repo_cache_id
from app.core.validation import validate_project_path
from app.core.zip_extract import extract_zip_to_temp
from app.core.redis_cache import RedisCache

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
    """Read file contents for graph nodes under clone_path (for repo View File)."""
    # ... (implementation unchanged)
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
            abs_key = str(resolved)
            if abs_key != rel_key:
                contents[abs_key] = content
        except (ValueError, OSError, UnicodeDecodeError):
            continue
    return contents


_MAX_LINE_COUNT_SIZE_BYTES = 1024 * 1024


def _enrich_nodes_with_file_stats(project_path: Path, nodes: list[Node]) -> list[Node]:
    # ... (implementation unchanged)
    project_resolved = Path(project_path).resolve()
    enriched: list[Node] = []
    for node in nodes:
        if node.node_type == "external":
            enriched.append(node)
            continue
        path_str = node.file_path
        try:
            path = Path(path_str)
            resolved = (project_resolved / path).resolve() if not path.is_absolute() else path.resolve()
            if not resolved.is_file():
                enriched.append(node)
                continue
            size_bytes = resolved.stat().st_size
            line_count: int | None = None
            if size_bytes <= _MAX_LINE_COUNT_SIZE_BYTES:
                try:
                    with open(resolved, "rb") as f:
                        line_count = sum(1 for _ in f)
                except (OSError, UnicodeDecodeError):
                    pass
            enriched.append(node.model_copy(update={"size_bytes": size_bytes, "line_count": line_count}))
        except (ValueError, OSError):
            enriched.append(node)
    return enriched


def _enrich_nodes_with_blame(project_path: Path, nodes: list[Node]) -> list[Node]:
    # ... (implementation unchanged)
    project_resolved = Path(project_path).resolve()
    work: list[tuple[int, Node, Path]] = []
    for i, node in enumerate(nodes):
        if node.node_type == "external":
            continue
        try:
            path = Path(node.file_path)
            resolved = (project_resolved / path).resolve() if not path.is_absolute() else path.resolve()
            if resolved.is_relative_to(project_resolved):
                work.append((i, node, resolved))
        except (ValueError, OSError, TypeError):
            pass
    if not work:
        return list(nodes)
    commit_by_index: dict[int, str] = {}
    max_workers = min(16, len(work))
    with ThreadPoolExecutor(max_workers=max(1, max_workers)) as pool:
        def do_blame(item: tuple[int, Node, Path]) -> tuple[int, str | None]:
            idx, _node, res = item
            blame = get_blame(project_resolved, res)
            return (idx, blame.get("commit_hash") if blame else None)
        for idx, commit_hash in pool.map(do_blame, work):
            if commit_hash:
                commit_by_index[idx] = commit_hash
    enriched: list[Node] = []
    for i, node in enumerate(nodes):
        if i in commit_by_index:
            enriched.append(node.model_copy(update={"commit_hash": commit_by_index[i]}))
        else:
            enriched.append(node)
    return enriched


tracer = trace.get_tracer(__name__)


class AnalysisService:
    def __init__(
        self,
        cache: CacheDB,
        parallel_parser: ParallelParser | None = None,
        max_memory_cache: int = 100,
        executor: ThreadPoolExecutor | None = None,
    ):
        self.cache = cache
        self.redis_cache = RedisCache() if settings.REDIS_ENABLED else None
        self.parallel_parser = parallel_parser or ParallelParser(max_workers=settings.MAX_WORKERS)
        self.executor = executor or ThreadPoolExecutor(max_workers=settings.MAX_WORKERS)
        self._memory_cache: OrderedDict = OrderedDict()
        self._max_memory_cache = max_memory_cache

    async def analyze_project(
        self,
        project_path: str,
        ignore_patterns: list[str] | None = None,
        extractor_backend: str | None = None,
        metrics_level: str | None = None,
    ) -> AnalysisResult:
        active_analyses.inc()
        try:
            path = validate_project_path(project_path)
            return await self._analyze_project_at_path(path, ignore_patterns, extractor_backend, metrics_level)
        finally:
            active_analyses.dec()

    async def _analyze_project_at_path(
        self,
        path: Path,
        ignore_patterns: list[str] | None,
        extractor_backend: str | None,
        metrics_level: str | None,
    ) -> AnalysisResult:
        loop = asyncio.get_event_loop()
        discoverer = FileDiscovery(ignore_patterns=ignore_patterns or [])
        files = discoverer.discover_files(path)
        cache_key = generate_project_cache_key(path, files)
        
        cached_result = self.get_analysis(cache_key)
        if cached_result:
            return cached_result

        cache_misses_total.inc()
        logger.info("Local project analysis cache miss", cache_id=cache_key)

        with analysis_duration_seconds.time():
            try:
                if not files:
                    raise AnalysisError("No supported source files found in project")

                all_imports, warnings = await loop.run_in_executor(
                    self.executor,
                    lambda: self.parallel_parser.parse_files(files, path, extractor_backend),
                )
                
                graph_builder = self._build_graph(path, all_imports)
                analyzer, metrics, pagerank, betweenness = self._analyze_graph(
                    graph_builder, metrics_level
                )
                warnings = self._add_cycle_warnings(metrics, warnings, path)
                resolved_level = self._resolve_metrics_level(metrics_level)
                cycle_participation = {} if resolved_level == "light" else analyzer.get_cycle_participation()
                node_depths = {} if resolved_level == "light" else analyzer.get_node_depths()
                closeness = {} if resolved_level == "light" else analyzer.get_closeness_centrality()
                eigenvector = {} if resolved_level == "light" else analyzer.get_eigenvector_centrality()
                external_ratio_map = {} if resolved_level == "light" else analyzer.get_external_ratio_per_node()
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
                    id=cache_key,
                    project_path=str(path),
                    root_path=str(path.resolve()),
                    nodes=nodes,
                    edges=graph_builder.get_edges(),
                    metrics=metrics,
                    warnings=warnings,
                )
                
                self._save_to_caches(result)
                self._cache_in_memory(cache_key, (result, analyzer, graph_builder))
                analysis_requests_total.labels(status="success").inc()
                
                return result
            except Exception as e:
                logger.exception("Analysis failed", project_path=str(path))
                raise AnalysisError("Failed to analyze project", details={"error": str(e)})

    def _build_graph(self, project_path: Path, all_imports: list) -> GraphBuilder:
        graph_builder = GraphBuilder(project_path)
        graph_builder.add_imports(all_imports)
        return graph_builder
    
    def _analyze_graph(
        self, graph_builder: GraphBuilder, metrics_level: str | None = None
    ) -> tuple[GraphAnalyzer, GraphMetrics, dict, dict]:
        analyzer = GraphAnalyzer(graph_builder.get_graph())
        resolved_level = self._resolve_metrics_level(metrics_level)
        metrics = analyzer.compute_metrics(light=resolved_level == "light")
        pagerank = analyzer.get_pagerank_scores()
        betweenness = analyzer.get_betweenness_centrality()
        return analyzer, metrics, pagerank, betweenness

    # ... (rest of the class methods are restored here)
    async def analyze_repository(
        self,
        repository_url: str,
        branch: str | None = None,
        ignore_patterns: list[str] | None = None,
        extractor_backend: str | None = None,
        metrics_level: str | None = None,
    ) -> AnalysisResult:
        # ... (implementation as it was)
        if not settings.REPOSITORY_ANALYSIS_ENABLED:
            raise ValidationError("Repository analysis is disabled")
        cache_id = repo_cache_id(repository_url, branch)
        cached = self.get_analysis(cache_id)
        if cached:
            return cached
        
        cache_misses_total.inc()
        clone_path: Path | None = None
        loop = asyncio.get_event_loop()
        try:
            clone_path = await loop.run_in_executor(
                self.executor, lambda: clone_repository(repository_url, branch=branch)
            )
            result = await self._analyze_project_at_path(
                clone_path, ignore_patterns, extractor_backend, metrics_level
            )
            file_contents = None
            if settings.REPOSITORY_FILE_PREVIEW_ENABLED:
                file_contents = await loop.run_in_executor(
                    self.executor, lambda: _collect_file_contents(clone_path, result.nodes)
                )
            repo_result = AnalysisResult(
                id=cache_id,
                project_path=repository_url,
                root_path=str(clone_path.resolve()),
                nodes=result.nodes,
                edges=result.edges,
                metrics=result.metrics,
                warnings=result.warnings,
                file_contents=file_contents,
            )
            self._save_to_caches(repo_result)
            self._cache_in_memory(cache_id, (repo_result, None, None))
            return repo_result
        finally:
            if clone_path:
                await loop.run_in_executor(self.executor, lambda: remove_clone(clone_path))

    async def analyze_zip(
        self,
        zip_content: bytes,
        filename: str,
        ignore_patterns: list[str] | None = None,
        extractor_backend: str | None = None,
        metrics_level: str | None = None,
    ) -> AnalysisResult:
        if not settings.ZIP_ANALYSIS_ENABLED:
            raise ValidationError("ZIP analysis is disabled")
        extract_path = None
        loop = asyncio.get_event_loop()
        try:
            extract_path = extract_zip_to_temp(
                zip_content,
                settings.MAX_ZIP_SIZE_MB,
                settings.MAX_ZIP_UNCOMPRESSED_MB,
            )
            result = await self._analyze_project_at_path(
                extract_path, ignore_patterns, extractor_backend, metrics_level
            )
            file_contents = None
            if settings.REPOSITORY_FILE_PREVIEW_ENABLED:
                file_contents = await loop.run_in_executor(
                    self.executor, lambda: _collect_file_contents(extract_path, result.nodes)
                )
            zip_analysis_id = str(uuid.uuid4())
            zip_result = AnalysisResult(
                id=zip_analysis_id,
                project_path=filename,
                root_path=str(extract_path.resolve()),
                nodes=result.nodes,
                edges=result.edges,
                metrics=result.metrics,
                warnings=result.warnings,
                file_contents=file_contents,
            )
            self.cache.delete(result.id)
            if result.id in self._memory_cache:
                del self._memory_cache[result.id]
            self._save_to_caches(zip_result)
            self._cache_in_memory(zip_analysis_id, (zip_result, None, None))
            return zip_result
        finally:
            if extract_path:
                await loop.run_in_executor(self.executor, lambda: shutil.rmtree(extract_path, ignore_errors=True))

    def get_analysis(self, analysis_id: str) -> Optional[AnalysisResult]:
        if analysis_id in self._memory_cache:
            cache_hits_total.inc()
            self._memory_cache.move_to_end(analysis_id)
            return self._memory_cache[analysis_id][0]
        if self.redis_cache and self.redis_cache.is_available:
            result = self.redis_cache.get(analysis_id)
            if result:
                cache_hits_total.inc()
                self._cache_in_memory(analysis_id, (result, None, None))
                return result
        result = self.cache.get(analysis_id)
        if result:
            cache_hits_total.inc()
            self._cache_in_memory(analysis_id, (result, None, None))
            return result
        return None

    def delete_analysis(self, analysis_id: str):
        if analysis_id in self._memory_cache:
            del self._memory_cache[analysis_id]
        if self.redis_cache:
            self.redis_cache.delete(analysis_id)
        if not self.cache.delete(analysis_id):
            raise NotFoundError(f"Analysis not found: {analysis_id}")

    async def import_graph_from_file(self, file_content: bytes, filename: str) -> AnalysisResult:
        graph, project_path = parse_imported_graph(file_content, filename)
        builder = GraphBuilder.from_graph(graph, project_path)
        analyzer, metrics, pagerank, betweenness = self._analyze_graph(builder)
        nodes = builder.get_nodes(pagerank, betweenness)
        edges = builder.get_edges()
        analysis_id = str(uuid.uuid4())
        result = AnalysisResult(id=analysis_id, project_path=project_path, root_path=project_path, nodes=nodes, edges=edges, metrics=metrics)
        self.cache.save(result)
        self._cache_in_memory(analysis_id, (result, analyzer, builder))
        return result

    def get_analyzer_and_builder(self, analysis_id: str) -> tuple[GraphAnalyzer, GraphBuilder]:
        if analysis_id not in self._memory_cache or self._memory_cache[analysis_id][1] is None:
            result = self.get_analysis(analysis_id)
            if not result:
                raise NotFoundError(f"Analysis not found: {analysis_id}")
            builder = GraphBuilder.from_analysis_result(result)
            analyzer = GraphAnalyzer(builder.get_graph())
            self._cache_in_memory(analysis_id, (result, analyzer, builder))
            return analyzer, builder
        return self._memory_cache[analysis_id][1], self._memory_cache[analysis_id][2]

    def _cache_in_memory(self, analysis_id: str, data: tuple[AnalysisResult, Optional[GraphAnalyzer], Optional[GraphBuilder]]):
        if len(self._memory_cache) >= self._max_memory_cache:
            self._memory_cache.popitem(last=False)
        self._memory_cache[analysis_id] = data
        memory_cache_size.set(len(self._memory_cache))

    def _save_to_caches(self, result: AnalysisResult) -> None:
        """Persist analysis result to configured caches."""
        if self.redis_cache:
            self.redis_cache.save(result)
        self.cache.save(result)

    @staticmethod
    def _resolve_metrics_level(metrics_level: str | None) -> str:
        """Resolve metrics level using defaults."""
        if metrics_level in ("light", "full"):
            return metrics_level
        return settings.METRICS_LEVEL_DEFAULT
    
    @staticmethod
    def _add_cycle_warnings(metrics: GraphMetrics, warnings: list[str], project_path: Path) -> list[str]:
        if metrics.circular_dependencies:
            for cycle in metrics.circular_dependencies[:5]:
                cycle_str = " → ".join([Path(node).name for node in cycle])
                warnings.append(f"Circular dependency: {cycle_str}")
        return warnings
