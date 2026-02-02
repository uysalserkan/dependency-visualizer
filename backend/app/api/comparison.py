"""Analysis comparison endpoints."""

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.api.models import AnalysisResult, Node, Edge
from app.core.cache import CacheDB
from app.core.exceptions import NotFoundError
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/compare", tags=["comparison"])


class ComparisonRequest(BaseModel):
    """Request model for analysis comparison."""
    
    analysis_id_1: str = Field(..., description="First analysis ID")
    analysis_id_2: str = Field(..., description="Second analysis ID")


class NodeDiff(BaseModel):
    """Node difference."""
    
    type: str  # added, removed, modified, unchanged
    node: Node
    changes: dict[str, Any] | None = None


class EdgeDiff(BaseModel):
    """Edge difference."""
    
    type: str  # added, removed, unchanged
    edge: Edge


class MetricsDiff(BaseModel):
    """Metrics difference."""
    
    metric_name: str
    value_1: Any
    value_2: Any
    change: Any
    change_percent: float | None = None


class ComparisonResult(BaseModel):
    """Comparison result between two analyses."""
    
    analysis_1: AnalysisResult
    analysis_2: AnalysisResult
    
    # Node changes
    nodes_added: list[Node]
    nodes_removed: list[Node]
    nodes_modified: list[NodeDiff]
    nodes_unchanged: int
    
    # Edge changes
    edges_added: list[Edge]
    edges_removed: list[Edge]
    edges_unchanged: int
    
    # Metrics changes
    metrics_diff: list[MetricsDiff]
    
    # Summary
    summary: dict[str, Any]


@router.post("/", response_model=ComparisonResult)
async def compare_analyses(request: ComparisonRequest):
    """Compare two analyses.
    
    Args:
        request: Comparison request with two analysis IDs
        
    Returns:
        Detailed comparison result
        
    Raises:
        HTTPException: If analyses not found
    """
    cache = CacheDB()
    
    # Get both analyses
    try:
        analysis_1 = cache.get(request.analysis_id_1)
        analysis_2 = cache.get(request.analysis_id_2)
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    
    if not analysis_1 or not analysis_2:
        raise HTTPException(
            status_code=404,
            detail="One or both analyses not found",
        )
    
    logger.info(
        "Comparing analyses",
        analysis_1=request.analysis_id_1,
        analysis_2=request.analysis_id_2,
    )
    
    # Compare nodes
    nodes_1 = {node.id: node for node in analysis_1.nodes}
    nodes_2 = {node.id: node for node in analysis_2.nodes}
    
    nodes_added = [
        nodes_2[node_id]
        for node_id in nodes_2.keys() - nodes_1.keys()
    ]
    
    nodes_removed = [
        nodes_1[node_id]
        for node_id in nodes_1.keys() - nodes_2.keys()
    ]
    
    nodes_modified = []
    for node_id in nodes_1.keys() & nodes_2.keys():
        node_1 = nodes_1[node_id]
        node_2 = nodes_2[node_id]
        
        # Check for changes
        changes = {}
        if node_1.imports_count != node_2.imports_count:
            changes["imports_count"] = {
                "from": node_1.imports_count,
                "to": node_2.imports_count,
                "diff": node_2.imports_count - node_1.imports_count,
            }
        
        if node_1.imported_by_count != node_2.imported_by_count:
            changes["imported_by_count"] = {
                "from": node_1.imported_by_count,
                "to": node_2.imported_by_count,
                "diff": node_2.imported_by_count - node_1.imported_by_count,
            }
        
        if node_1.pagerank != node_2.pagerank:
            changes["pagerank"] = {
                "from": node_1.pagerank,
                "to": node_2.pagerank,
                "diff": (node_2.pagerank or 0) - (node_1.pagerank or 0),
            }
        
        if changes:
            nodes_modified.append(
                NodeDiff(
                    type="modified",
                    node=node_2,
                    changes=changes,
                )
            )
    
    nodes_unchanged = len(nodes_1.keys() & nodes_2.keys()) - len(nodes_modified)
    
    # Compare edges
    edges_1 = {edge.id: edge for edge in analysis_1.edges}
    edges_2 = {edge.id: edge for edge in analysis_2.edges}
    
    edges_added = [
        edges_2[edge_id]
        for edge_id in edges_2.keys() - edges_1.keys()
    ]
    
    edges_removed = [
        edges_1[edge_id]
        for edge_id in edges_1.keys() - edges_2.keys()
    ]
    
    edges_unchanged = len(edges_1.keys() & edges_2.keys())
    
    # Compare metrics
    metrics_diff = []
    m1 = analysis_1.metrics
    m2 = analysis_2.metrics
    
    # Numeric metrics
    numeric_metrics = [
        ("total_nodes", m1.total_nodes, m2.total_nodes),
        ("total_edges", m1.total_edges, m2.total_edges),
        ("total_files", m1.total_files, m2.total_files),
        ("avg_degree", m1.avg_degree, m2.avg_degree),
        ("max_degree", m1.max_degree, m2.max_degree),
        ("density", m1.density, m2.density),
        ("num_components", m1.num_components, m2.num_components),
        ("avg_clustering", m1.avg_clustering, m2.avg_clustering),
        ("circular_dependencies", m1.circular_dependencies, m2.circular_dependencies),
    ]
    
    for metric_name, value_1, value_2 in numeric_metrics:
        change = value_2 - value_1
        change_percent = (change / value_1 * 100) if value_1 != 0 else None
        
        metrics_diff.append(
            MetricsDiff(
                metric_name=metric_name,
                value_1=value_1,
                value_2=value_2,
                change=change,
                change_percent=change_percent,
            )
        )
    
    # Boolean metrics
    if m1.is_connected != m2.is_connected:
        metrics_diff.append(
            MetricsDiff(
                metric_name="is_connected",
                value_1=m1.is_connected,
                value_2=m2.is_connected,
                change="changed",
            )
        )
    
    # Summary
    summary = {
        "nodes": {
            "added": len(nodes_added),
            "removed": len(nodes_removed),
            "modified": len(nodes_modified),
            "unchanged": nodes_unchanged,
            "total_change": len(nodes_added) + len(nodes_removed) + len(nodes_modified),
        },
        "edges": {
            "added": len(edges_added),
            "removed": len(edges_removed),
            "unchanged": edges_unchanged,
            "total_change": len(edges_added) + len(edges_removed),
        },
        "significant_changes": [
            diff.metric_name
            for diff in metrics_diff
            if diff.change_percent and abs(diff.change_percent) > 10
        ],
    }
    
    return ComparisonResult(
        analysis_1=analysis_1,
        analysis_2=analysis_2,
        nodes_added=nodes_added,
        nodes_removed=nodes_removed,
        nodes_modified=nodes_modified,
        nodes_unchanged=nodes_unchanged,
        edges_added=edges_added,
        edges_removed=edges_removed,
        edges_unchanged=edges_unchanged,
        metrics_diff=metrics_diff,
        summary=summary,
    )


@router.get("/recent")
async def get_recent_comparisons(limit: int = 10):
    """Get recent analyses for comparison.
    
    Args:
        limit: Maximum number of analyses to return
        
    Returns:
        List of recent analyses
    """
    cache = CacheDB()
    analyses = cache.list_analyses(limit=limit)
    
    return {
        "analyses": [
            {
                "id": analysis.id,
                "project_path": analysis.project_path,
                "timestamp": analysis.timestamp,
                "nodes": len(analysis.nodes),
                "edges": len(analysis.edges),
            }
            for analysis in analyses
        ],
    }
