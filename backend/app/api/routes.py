"""API routes for import visualization."""

from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import JSONResponse, Response

from app.api.models import (
    AnalyzeRequest,
    AnalyzeRepositoryRequest,
    AnalysisResult,
    AnalysisResultResponse,
    FilePreview,
    InsightItem,
    InsightsResponse,
    InsightsSummary,
    ImportInfo,
)
from app.config import settings
from app.core.exceptions import AnalysisError, NotFoundError, SecurityError, ValidationError
from app.core.graph.builder import GraphBuilder
from app.core.language_detector import LanguageDetector
from app.core.logging import get_logger
from app.dependencies import get_analysis_service, get_cache_db, get_language_detector
from app.middleware.rate_limiter import limiter
from app.services.analysis_service import AnalysisService, _normalize_file_key

logger = get_logger(__name__)

router = APIRouter()


def _rate_limit_exempt() -> bool:
    """Exempt from rate limit when rate limiting is disabled (called with no args by slowapi)."""
    return not settings.RATE_LIMIT_ENABLED


@router.post("/analyze", response_model=AnalysisResultResponse)
@limiter.limit(settings.RATE_LIMIT_ANALYZE, exempt_when=_rate_limit_exempt)
async def analyze_project(
    request: Request,
    analyze_request: AnalyzeRequest,
    service: AnalysisService = Depends(get_analysis_service),
):
    """Analyze a project and return dependency graph.

    Rate limit: 10 requests per minute (CPU-intensive operation)

    Args:
        request: FastAPI request (required by rate limiter decorator)
        analyze_request: Analysis request with project path and options
        service: Injected analysis service

    Returns:
        Analysis result with graph data and metrics
    """
    result = await service.analyze_project(
        project_path=analyze_request.project_path,
        ignore_patterns=analyze_request.ignore_patterns,
        extractor_backend=analyze_request.extractor_backend,
    )
    # Return Response so slowapi can inject rate-limit headers (exclude file_contents to keep payload small)
    return JSONResponse(
        content=result.model_dump(exclude={"file_contents"}),
        status_code=200,
    )


@router.post("/analyze/repository", response_model=AnalysisResultResponse)
@limiter.limit(settings.RATE_LIMIT_ANALYZE_REPO, exempt_when=_rate_limit_exempt)
async def analyze_repository(
    request: Request,
    body: AnalyzeRepositoryRequest,
    service: AnalysisService = Depends(get_analysis_service),
):
    """Analyze a project from a Git repository URL (HTTPS).

    Clones the repository to a temporary directory, runs analysis, then removes the clone.
    Rate limit: 5 requests per minute (clone + analysis).

    Supported hosts (configurable): github.com, gitlab.com, bitbucket.org, etc.

    Args:
        request: FastAPI request (required by rate limiter)
        body: Repository URL, optional branch/tag/commit, ignore patterns
        service: Injected analysis service

    Returns:
        Analysis result with graph data and metrics
    """
    result = await service.analyze_repository(
        repository_url=body.repository_url,
        branch=body.branch,
        ignore_patterns=body.ignore_patterns,
        extractor_backend=body.extractor_backend,
    )
    return JSONResponse(
        content=result.model_dump(exclude={"file_contents"}),
        status_code=200,
    )


@router.get("/analysis/{analysis_id}", response_model=AnalysisResultResponse)
async def get_analysis(
    analysis_id: str,
    service: AnalysisService = Depends(get_analysis_service),
):
    """Retrieve a cached analysis result.
    
    Args:
        analysis_id: ID of the analysis
        service: Injected analysis service
        
    Returns:
        Analysis result (file_contents excluded to keep payload small)
    """
    result = service.get_analysis(analysis_id)
    return AnalysisResultResponse(**result.model_dump(exclude={"file_contents"}))


@router.delete("/analysis/{analysis_id}")
async def delete_analysis(
    analysis_id: str,
    service: AnalysisService = Depends(get_analysis_service),
):
    """Delete a cached analysis result.
    
    Args:
        analysis_id: ID of the analysis
        service: Injected analysis service
        
    Returns:
        Success message
    """
    service.delete_analysis(analysis_id)
    logger.info("Analysis deleted via API", analysis_id=analysis_id)
    return {"message": "Analysis deleted successfully"}


@router.post("/analysis/import", response_model=AnalysisResultResponse)
async def import_graph(
    file: UploadFile = File(..., description="Exported graph file (.json, .graphml, .gexf)"),
    service: AnalysisService = Depends(get_analysis_service),
):
    """Import an exported graph file and visualize it.

    Accepts JSON (our export format), GraphML, or GEXF. Returns the same
    AnalysisResult shape as /analyze so the frontend can display the graph.

    Args:
        file: Uploaded file (extension .json, .graphml, or .gexf)
        service: Injected analysis service

    Returns:
        Analysis result (id, nodes, edges, metrics) saved to cache
    """
    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty file")
        result = await service.import_graph_from_file(content, file.filename or "export.json")
        return JSONResponse(content=result.model_dump(exclude={"file_contents"}), status_code=200)
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Graph import failed", filename=file.filename)
        raise HTTPException(status_code=500, detail="Failed to import graph")


@router.get("/analysis/{analysis_id}/file-preview")
async def get_file_preview(
    analysis_id: str,
    file_path: str = Query(..., description="Path to file within project"),
    service: AnalysisService = Depends(get_analysis_service),
):
    """Get preview of a file's content and imports.
    
    For repository analyses, content is served from cached file_contents (no disk).
    For local analyses, content is read from project_path on disk.
    
    Args:
        analysis_id: ID of the analysis
        file_path: Path to file within project
        service: Injected analysis service
        
    Returns:
        File preview with content and imports
    """
    try:
        analysis = service.get_analysis(analysis_id)

        # Repository analysis: serve from cached file_contents (clone was removed)
        if analysis.file_contents:
            # Lookup: frontend may send node.file_path as absolute or relative
            key = file_path if file_path in analysis.file_contents else _normalize_file_key(file_path)
            content = analysis.file_contents.get(key)
            if content is None:
                # Try matching by suffix (e.g. absolute path ends with relative key)
                for k, v in analysis.file_contents.items():
                    if file_path == k or file_path.endswith(k) or k.endswith(file_path):
                        content = v
                        key = k
                        break
            if content is not None:
                imports = [
                    ImportInfo(
                        source_file=edge.source,
                        imported_module=edge.target,
                        import_type=edge.import_type,
                        line_number=edge.line_numbers[0] if edge.line_numbers else 0,
                    )
                    for edge in analysis.edges
                    if _normalize_file_key(edge.source) == key
                ]
                return FilePreview(
                    file_path=key,
                    content=content,
                    line_count=content.count("\n") + 1 if content else 0,
                    size_bytes=len(content.encode("utf-8")),
                    imports=imports,
                )
            raise HTTPException(
                status_code=404,
                detail="File not found in cached analysis",
            )

        # Remote analysis but no file_contents (e.g. old cache entry)
        if analysis.project_path.startswith(("http://", "https://")):
            raise HTTPException(
                status_code=404,
                detail="File preview is not available for this analysis. Re-analyze the repository to enable View File.",
            )

        # Local analysis: read from disk
        project_path = Path(analysis.project_path)
        from app.core.validation import sanitize_file_path
        file_path_obj = sanitize_file_path(file_path, project_path)

        try:
            with open(file_path_obj, "r", encoding="utf-8") as f:
                max_size = settings.MAX_FILE_PREVIEW_SIZE
                content = f.read(max_size)
                truncated = f.read(1) != ""
        except UnicodeDecodeError:
            content = "[Binary file - preview not available]"
            truncated = False
        except Exception as e:
            logger.error("Failed to read file", file_path=str(file_path_obj), error=str(e))
            raise HTTPException(status_code=500, detail="Failed to read file")

        file_path_str = str(file_path_obj)
        file_path_resolved = str(file_path_obj.resolve())
        imports = []
        for edge in analysis.edges:
            edge_source_resolved = str(
                (project_path / edge.source).resolve()
                if not Path(edge.source).is_absolute()
                else Path(edge.source).resolve()
            )
            if edge.source == file_path_str or edge_source_resolved == file_path_resolved:
                line_num = edge.line_numbers[0] if edge.line_numbers else 0
                imports.append(
                    ImportInfo(
                        source_file=edge.source,
                        imported_module=edge.target,
                        import_type=edge.import_type,
                        line_number=line_num,
                    )
                )

        line_count = content.count("\n") + 1 if content else 0
        size_bytes = file_path_obj.stat().st_size

        return FilePreview(
            file_path=str(file_path_obj.relative_to(project_path)),
            content=content,
            line_count=line_count,
            size_bytes=size_bytes,
            imports=imports,
        )

    except HTTPException:
        raise
    except SecurityError as e:
        logger.warning("Security violation in file preview", error=str(e))
        raise HTTPException(status_code=403, detail=str(e))
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.exception("File preview failed")
        raise HTTPException(status_code=500, detail="Failed to preview file")


@router.get("/analysis/{analysis_id}/export")
@limiter.limit(settings.RATE_LIMIT_EXPORT, exempt_when=_rate_limit_exempt)
async def export_graph(
    request: Request,
    analysis_id: str,
    format: str = Query("json", regex="^(json|graphml|gexf)$"),
    service: AnalysisService = Depends(get_analysis_service),
):
    """Export dependency graph in various formats.

    Rate limit: 20 requests per minute.
    Uses get_analysis (memory or disk cache) so export works after refresh or eviction.

    Args:
        request: FastAPI request (required by rate limiter decorator)
        analysis_id: ID of the analysis
        format: Export format (json, graphml, gexf)
        service: Injected analysis service

    Returns:
        Exported graph data (JSON body or raw file for graphml/gexf)
    """
    try:
        analysis = service.get_analysis(analysis_id)

        if format == "json":
            content = {
                "elements": {
                    "nodes": [{"data": n.model_dump()} for n in analysis.nodes],
                    "edges": [{"data": e.model_dump()} for e in analysis.edges],
                },
                "metadata": {
                    "project_path": analysis.project_path,
                    "total_files": analysis.metrics.total_files,
                    "total_imports": analysis.metrics.total_imports,
                },
            }
            return JSONResponse(content=content, status_code=200)

        elif format == "graphml":
            import networkx as nx
            from io import BytesIO

            builder = GraphBuilder.from_analysis_result(analysis)
            graph = builder.get_graph()
            buffer = BytesIO()
            nx.write_graphml(graph, buffer)
            raw = buffer.getvalue()
            return Response(
                content=raw,
                media_type="application/xml",
                headers={
                    "Content-Disposition": f'attachment; filename="graph_{analysis_id}.graphml"',
                },
            )

        elif format == "gexf":
            import networkx as nx
            from io import BytesIO

            builder = GraphBuilder.from_analysis_result(analysis)
            graph = builder.get_graph()
            buffer = BytesIO()
            nx.write_gexf(graph, buffer)
            raw = buffer.getvalue()
            return Response(
                content=raw,
                media_type="application/xml",
                headers={
                    "Content-Disposition": f'attachment; filename="graph_{analysis_id}.gexf"',
                },
            )

    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.exception("Graph export failed")
        raise HTTPException(status_code=500, detail="Failed to export graph")


@router.get("/analysis/{analysis_id}/insights")
async def get_insights(
    analysis_id: str,
    service: AnalysisService = Depends(get_analysis_service),
):
    """Get automated insights and recommendations for a project.
    
    Args:
        analysis_id: ID of the analysis
        service: Injected analysis service
        
    Returns:
        Project insights and recommendations
    """
    try:
        analyzer, builder = service.get_analyzer_and_builder(analysis_id)
        analysis = service.get_analysis(analysis_id)
        metrics = analysis.metrics
        
        # Calculate health score
        health_score = 100
        issues = []
        recommendations = []
        
        # Circular dependencies
        if metrics.circular_dependencies:
            severity = len(metrics.circular_dependencies)
            health_score -= min(severity * 5, 30)
            issues.append({
                "type": "circular_dependencies",
                "severity": "high" if severity > 5 else "medium",
                "count": severity,
                "message": f"Found {severity} circular dependencies",
            })
            recommendations.append({
                "category": "architecture",
                "priority": "high",
                "title": "Break circular dependencies",
                "description": "Circular dependencies make code harder to test and maintain. Consider refactoring to break these cycles.",
            })
        
        # Import depth
        if metrics.max_import_depth > 10:
            health_score -= (metrics.max_import_depth - 10) * 2
            issues.append({
                "type": "deep_imports",
                "severity": "medium",
                "depth": metrics.max_import_depth,
                "message": f"Maximum import depth is {metrics.max_import_depth}",
            })
            recommendations.append({
                "category": "architecture",
                "priority": "medium",
                "title": "Reduce import depth",
                "description": "Deep import chains can indicate overly complex dependencies. Consider flattening your module structure.",
            })
        
        # Isolated modules
        if metrics.isolated_modules:
            issues.append({
                "type": "isolated_modules",
                "severity": "low",
                "count": len(metrics.isolated_modules),
                "message": f"Found {len(metrics.isolated_modules)} isolated modules",
            })
        
        # Hub modules (from PageRank)
        hub_modules = analyzer.get_hub_modules(top_n=5)
        if hub_modules:
            recommendations.append({
                "category": "testing",
                "priority": "high",
                "title": "Focus testing on hub modules",
                "description": f"The top 5 most important modules are: {', '.join([m[0] for m in hub_modules[:5]])}. These should have comprehensive tests.",
            })
        
        health_score = max(0, min(100, health_score))
        health_status = (
            "excellent" if health_score >= 90
            else "good" if health_score >= 70
            else "fair" if health_score >= 50
            else "poor"
        )

        # Map issues to frontend InsightItem (type, title, description, severity)
        def _issue_to_insight(issue: dict) -> InsightItem:
            severity = issue.get("severity", "medium")
            if severity not in ("high", "medium", "low"):
                severity = "medium"
            msg = issue.get("message", "")
            insight_type = "warning" if severity in ("high", "medium") else "info"
            return InsightItem(
                type=insight_type,
                title=msg[:80] if len(msg) > 80 else msg or "Issue",
                description=msg,
                severity=severity,
            )

        insights = [_issue_to_insight(i) for i in issues]
        stats_dict = metrics.statistics.dict() if metrics.statistics else {}
        summary = InsightsSummary(
            total_files=metrics.total_files,
            circular_dependencies=len(metrics.circular_dependencies),
            isolated_modules=len(metrics.isolated_modules),
            max_depth=metrics.max_import_depth,
        )

        return InsightsResponse(
            health_score=health_score,
            health_status=health_status,
            insights=insights,
            recommendations=recommendations,
            summary=summary,
            issues=issues,
            statistics=stats_dict,
        )
    
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.exception("Insights generation failed")
        raise HTTPException(status_code=500, detail="Failed to generate insights")


@router.post("/compare")
async def compare_analyses(
    analysis_id_1: str = Query(..., description="First analysis ID (before)"),
    analysis_id_2: str = Query(..., description="Second analysis ID (after)"),
    service: AnalysisService = Depends(get_analysis_service),
):
    """Compare two analysis results.
    
    Args:
        analysis_id_1: ID of the first analysis (before)
        analysis_id_2: ID of the second analysis (after)
        service: Injected analysis service
        
    Returns:
        Comparison results with differences
    """
    try:
        analysis1 = service.get_analysis(analysis_id_1)
        analysis2 = service.get_analysis(analysis_id_2)
        
        # Compute differences
        node_ids_1 = {node.id for node in analysis1.nodes}
        node_ids_2 = {node.id for node in analysis2.nodes}
        
        added_nodes = list(node_ids_2 - node_ids_1)
        removed_nodes = list(node_ids_1 - node_ids_2)
        
        edge_ids_1 = {(edge.source, edge.target) for edge in analysis1.edges}
        edge_ids_2 = {(edge.source, edge.target) for edge in analysis2.edges}
        
        added_edges = [{"source": s, "target": t} for s, t in (edge_ids_2 - edge_ids_1)]
        removed_edges = [{"source": s, "target": t} for s, t in (edge_ids_1 - edge_ids_2)]
        
        # Metrics comparison
        metrics_diff = {
            "total_files": {
                "before": analysis1.metrics.total_files,
                "after": analysis2.metrics.total_files,
                "change": analysis2.metrics.total_files - analysis1.metrics.total_files,
            },
            "total_imports": {
                "before": analysis1.metrics.total_imports,
                "after": analysis2.metrics.total_imports,
                "change": analysis2.metrics.total_imports - analysis1.metrics.total_imports,
            },
            "circular_dependencies": {
                "before": len(analysis1.metrics.circular_dependencies),
                "after": len(analysis2.metrics.circular_dependencies),
                "change": len(analysis2.metrics.circular_dependencies) - len(analysis1.metrics.circular_dependencies),
            },
            "max_import_depth": {
                "before": analysis1.metrics.max_import_depth,
                "after": analysis2.metrics.max_import_depth,
                "change": analysis2.metrics.max_import_depth - analysis1.metrics.max_import_depth,
            },
        }
        
        # Compute impact score
        impact_score = abs(len(added_nodes) - len(removed_nodes)) + abs(len(added_edges) - len(removed_edges))
        
        return {
            "analysis_1": {"id": analysis_id_1, "project_path": analysis1.project_path},
            "analysis_2": {"id": analysis_id_2, "project_path": analysis2.project_path},
            "changes": {
                "added_nodes": added_nodes,
                "removed_nodes": removed_nodes,
                "added_edges": added_edges,
                "removed_edges": removed_edges,
            },
            "metrics_diff": metrics_diff,
            "impact_score": impact_score,
            "summary": {
                "nodes_changed": len(added_nodes) + len(removed_nodes),
                "edges_changed": len(added_edges) + len(removed_edges),
                "improvement": metrics_diff["circular_dependencies"]["change"] < 0,
            },
        }
    
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.exception("Comparison failed")
        raise HTTPException(status_code=500, detail="Failed to compare analyses")


@router.get("/languages")
async def get_supported_languages():
    """Get list of supported programming languages.
    
    Returns:
        List of supported languages and extensions
    """
    from app.core.parser.factory import ParserRegistry
    
    languages = ParserRegistry.get_supported_languages()
    extensions = ParserRegistry.get_supported_extensions()
    
    return {
        "languages": languages,
        "extensions": extensions,
        "count": len(languages),
    }


@router.post("/detect-languages")
async def detect_project_languages(
    request: AnalyzeRequest,
    detector: LanguageDetector = Depends(get_language_detector),
):
    """Detect programming languages used in a project.
    
    Args:
        request: Request with project_path
        detector: Injected language detector
        
    Returns:
        Language breakdown with statistics
    """
    try:
        from app.core.validation import validate_project_path
        
        path = validate_project_path(request.project_path)
        breakdown = detector.get_language_breakdown(path)
        
        logger.info(
            "Language detection completed",
            project_path=str(path),
            languages=list(breakdown["languages"].keys()),
        )
        
        return breakdown
    
    except (ValidationError, SecurityError) as e:
        # Will be handled by error handler
        raise


@router.get("/cache/stats")
async def get_cache_stats(cache=Depends(get_cache_db)):
    """Get cache statistics.
    
    Args:
        cache: Injected cache database
        
    Returns:
        Cache statistics
    """
    return cache.get_stats()


@router.post("/cache/cleanup")
async def cleanup_cache(
    days: int = Query(7, ge=1, le=365, description="Remove entries older than this many days"),
    cache=Depends(get_cache_db),
):
    """Clean up old cache entries.
    
    Args:
        days: Remove entries older than this many days
        cache: Injected cache database
        
    Returns:
        Number of entries removed
    """
    removed = cache.cleanup_old(days)
    logger.info("Cache cleanup completed", removed_count=removed, days=days)
    return {"removed": removed, "message": f"Removed {removed} old cache entries"}
