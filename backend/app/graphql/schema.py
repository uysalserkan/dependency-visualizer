"""GraphQL schema definitions."""

from typing import List, Optional

import strawberry
from strawberry.fastapi import GraphQLRouter
from strawberry.scalars import JSON

from app.api.models import (
    AnalysisResult,
    CycleDetail,
    Edge,
    GraphMetrics,
    ImportStatistics,
    Node,
)
from app.core.cache import CacheDB
from app.core.logging import get_logger

logger = get_logger(__name__)


# GraphQL Types
@strawberry.type
class NodeType:
    """GraphQL type for a node."""

    id: str
    label: str
    type: str
    module_path: str
    file_path: Optional[str] = None
    language: str
    external_kind: Optional[str] = None  # "stdlib" | "package" for external nodes
    version: Optional[str] = None  # Installed version for external packages (e.g. PyPI, npm)
    imports_count: int
    imported_by_count: int
    pagerank: Optional[float] = None
    betweenness: Optional[float] = None
    cycle_count: int = 0
    instability: float = 0.0
    depth: int = 0
    closeness: float = 0.0
    eigenvector: float = 0.0
    external_ratio: float = 0.0


@strawberry.type
class EdgeType:
    """GraphQL type for an edge."""
    
    id: str
    source: str
    target: str
    import_type: str
    line_number: Optional[int] = None


@strawberry.type
class CycleDetailType:
    """GraphQL type for cycle detail."""

    nodes: List[str]
    length: int
    severity: str
    edges: JSON


@strawberry.type
class HubModuleType:
    """GraphQL type for hub module (name, score)."""

    module: str
    score: float


@strawberry.type
class ModuleCountType:
    """GraphQL type for module + count (top importers/imported)."""

    module: str
    count: float


@strawberry.type
class StatisticsType:
    """GraphQL type for import statistics."""

    avg_imports_per_file: float
    max_imports_in_file: int
    max_imports_file: str
    most_imported_module: str
    most_imported_count: int
    hub_modules: List[HubModuleType]
    top_importers: List[ModuleCountType] = strawberry.field(default_factory=list)
    top_imported: List[ModuleCountType] = strawberry.field(default_factory=list)


@strawberry.type
class MetricsType:
    """GraphQL type for graph metrics (aligned with GraphMetrics)."""

    total_files: int
    total_imports: int
    circular_dependencies: List[List[str]]
    max_import_depth: int
    isolated_modules: List[str]
    cycle_details: List[CycleDetailType]
    statistics: Optional[StatisticsType] = None
    graph_density: float = 0.0
    total_cycles: int = 0
    external_edges_ratio: float = 0.0
    entry_points_count: int = 0
    external_node_count: int = 0
    internal_edges: int = 0
    avg_cycle_length: float = 0.0
    max_cycle_length: int = 0
    largest_scc_size: int = 0


@strawberry.type
class AnalysisType:
    """GraphQL type for analysis result."""
    
    id: str
    project_path: str
    nodes: List[NodeType]
    edges: List[EdgeType]
    metrics: MetricsType
    warnings: List[str]
    timestamp: str
    
    @strawberry.field
    def node(self, id: str) -> Optional[NodeType]:
        """Get a specific node by ID.
        
        Args:
            id: Node ID
            
        Returns:
            Node or None
        """
        for node in self.nodes:
            if node.id == id:
                return node
        return None
    
    @strawberry.field
    def nodes_by_type(self, type: str) -> List[NodeType]:
        """Get nodes filtered by type.
        
        Args:
            type: Node type
            
        Returns:
            List of nodes
        """
        return [node for node in self.nodes if node.type == type]
    
    @strawberry.field
    def nodes_by_language(self, language: str) -> List[NodeType]:
        """Get nodes filtered by language.
        
        Args:
            language: Programming language
            
        Returns:
            List of nodes
        """
        return [node for node in self.nodes if node.language == language]
    
    @strawberry.field
    def top_nodes(self, limit: int = 10) -> List[NodeType]:
        """Get top nodes by PageRank.
        
        Args:
            limit: Maximum number of nodes
            
        Returns:
            List of nodes
        """
        sorted_nodes = sorted(
            self.nodes,
            key=lambda n: n.pagerank or 0,
            reverse=True,
        )
        return sorted_nodes[:limit]
    
    @strawberry.field
    def edges_for_node(self, node_id: str) -> List[EdgeType]:
        """Get all edges connected to a node.
        
        Args:
            node_id: Node ID
            
        Returns:
            List of edges
        """
        return [
            edge for edge in self.edges
            if edge.source == node_id or edge.target == node_id
        ]


# GraphQL Queries
@strawberry.type
class Query:
    """GraphQL query root."""
    
    @strawberry.field
    def analysis(self, id: str) -> Optional[AnalysisType]:
        """Get analysis by ID.
        
        Args:
            id: Analysis ID
            
        Returns:
            Analysis result or None
        """
        cache = CacheDB()
        result = cache.get(id)
        
        if not result:
            return None
        
        return convert_to_graphql(result)
    
    @strawberry.field
    def recent_analyses(self, limit: int = 10) -> List[AnalysisType]:
        """Get recent analyses.
        
        Args:
            limit: Maximum number of results
            
        Returns:
            List of analyses
        """
        cache = CacheDB()
        analyses = cache.list_analyses(limit=limit)
        
        return [convert_to_graphql(analysis) for analysis in analyses]
    
    @strawberry.field
    def search_nodes(
        self,
        analysis_id: str,
        query: str,
        limit: int = 20,
    ) -> List[NodeType]:
        """Search nodes by label or module path.
        
        Args:
            analysis_id: Analysis ID
            query: Search query
            limit: Maximum results
            
        Returns:
            List of matching nodes
        """
        cache = CacheDB()
        result = cache.get(analysis_id)
        
        if not result:
            return []
        
        query_lower = query.lower()
        matching_nodes = [
            node for node in result.nodes
            if query_lower in node.label.lower()
            or query_lower in node.module_path.lower()
        ]
        
        return [convert_node_to_graphql(node) for node in matching_nodes[:limit]]


def convert_to_graphql(result: AnalysisResult) -> AnalysisType:
    """Convert API model to GraphQL type.
    
    Args:
        result: Analysis result
        
    Returns:
        GraphQL type
    """
    return AnalysisType(
        id=result.id,
        project_path=result.project_path,
        nodes=[convert_node_to_graphql(node) for node in result.nodes],
        edges=[convert_edge_to_graphql(edge) for edge in result.edges],
        metrics=convert_metrics_to_graphql(result.metrics),
        warnings=result.warnings,
        timestamp=getattr(result, "timestamp", ""),
    )


def convert_node_to_graphql(node: Node) -> NodeType:
    """Convert Node to NodeType.

    Args:
        node: Node model

    Returns:
        GraphQL node type
    """
    return NodeType(
        id=node.id,
        label=node.label,
        type=node.node_type,
        module_path=node.file_path or node.id,
        file_path=node.file_path,
        language="",  # Not on API Node; infer from file path if needed
        external_kind=getattr(node, "external_kind", None),
        version=getattr(node, "version", None),
        imports_count=node.import_count,
        imported_by_count=node.imported_by_count,
        pagerank=node.pagerank,
        betweenness=node.betweenness,
        cycle_count=node.cycle_count,
        instability=node.instability,
        depth=node.depth,
        closeness=node.closeness,
        eigenvector=node.eigenvector,
        external_ratio=node.external_ratio,
    )


def convert_edge_to_graphql(edge: Edge) -> EdgeType:
    """Convert Edge to EdgeType.

    Args:
        edge: Edge model

    Returns:
        GraphQL edge type
    """
    edge_id = f"{edge.source}_{edge.target}"
    line_number = edge.line_numbers[0] if edge.line_numbers else None
    return EdgeType(
        id=edge_id,
        source=edge.source,
        target=edge.target,
        import_type=edge.import_type,
        line_number=line_number,
    )


def _convert_cycle_detail_to_graphql(detail: CycleDetail) -> CycleDetailType:
    """Convert CycleDetail to CycleDetailType."""
    return CycleDetailType(
        nodes=detail.nodes,
        length=detail.length,
        severity=detail.severity,
        edges=detail.edges,
    )


def _convert_statistics_to_graphql(stats: ImportStatistics) -> StatisticsType:
    """Convert ImportStatistics to StatisticsType."""
    return StatisticsType(
        avg_imports_per_file=stats.avg_imports_per_file,
        max_imports_in_file=stats.max_imports_in_file,
        max_imports_file=stats.max_imports_file,
        most_imported_module=stats.most_imported_module,
        most_imported_count=stats.most_imported_count,
        hub_modules=[
            HubModuleType(module=mod, score=score)
            for mod, score in stats.hub_modules
        ],
        top_importers=[
            ModuleCountType(module=m.module, count=m.count)
            for m in (stats.top_importers or [])
        ],
        top_imported=[
            ModuleCountType(module=m.module, count=m.count)
            for m in (stats.top_imported or [])
        ],
    )


def convert_metrics_to_graphql(metrics: GraphMetrics) -> MetricsType:
    """Convert GraphMetrics to MetricsType.

    Args:
        metrics: Metrics model

    Returns:
        GraphQL metrics type
    """
    return MetricsType(
        total_files=metrics.total_files,
        total_imports=metrics.total_imports,
        circular_dependencies=metrics.circular_dependencies,
        max_import_depth=metrics.max_import_depth,
        isolated_modules=metrics.isolated_modules,
        cycle_details=[
            _convert_cycle_detail_to_graphql(d) for d in metrics.cycle_details
        ],
        statistics=(
            _convert_statistics_to_graphql(metrics.statistics)
            if metrics.statistics
            else None
        ),
        graph_density=metrics.graph_density,
        total_cycles=metrics.total_cycles,
        external_edges_ratio=metrics.external_edges_ratio,
        entry_points_count=getattr(metrics, "entry_points_count", 0),
        external_node_count=getattr(metrics, "external_node_count", 0),
        internal_edges=getattr(metrics, "internal_edges", 0),
        avg_cycle_length=getattr(metrics, "avg_cycle_length", 0.0),
        max_cycle_length=getattr(metrics, "max_cycle_length", 0),
        largest_scc_size=getattr(metrics, "largest_scc_size", 0),
    )


# Create GraphQL schema
schema = strawberry.Schema(query=Query)

# Create GraphQL router
graphql_router = GraphQLRouter(schema, path="/graphql")
