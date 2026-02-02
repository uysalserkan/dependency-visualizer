"""Pydantic models for API requests and responses."""

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class AnalyzeRequest(BaseModel):
    """Request model for analyzing a project."""

    project_path: str = Field(..., description="Absolute path to the project directory")
    include_external: bool = Field(
        default=False, description="Include external/installed packages"
    )
    ignore_patterns: list[str] = Field(
        default_factory=lambda: [".venv", "venv", "__pycache__", ".git", "node_modules"],
        description="Patterns to ignore during file discovery",
    )
    extractor_backend: Literal["python", "go"] | None = Field(
        default=None,
        description="Override extractor: 'python' or 'go'. If omitted, uses EXTRACTOR_BACKEND config.",
    )

    @field_validator("ignore_patterns")
    @classmethod
    def validate_patterns(cls, v):
        """Validate ignore patterns to prevent ReDoS."""
        from app.core.validation import sanitize_ignore_patterns
        return sanitize_ignore_patterns(v)


class ImportInfo(BaseModel):
    """Information about a single import statement."""

    source_file: str = Field(..., description="File containing the import")
    imported_module: str = Field(..., description="Module being imported")
    import_type: Literal["module", "from"] = Field(..., description="Type of import statement")
    line_number: int = Field(..., description="Line number of the import")


class Node(BaseModel):
    """Graph node representing a module or file."""

    id: str = Field(..., description="Unique node identifier")
    label: str = Field(..., description="Display label for the node")
    file_path: str = Field(..., description="Full path to the file")
    node_type: Literal["module", "package", "external"] = Field(
        ..., description="Type of node"
    )
    import_count: int = Field(default=0, description="Number of imports from this module")
    imported_by_count: int = Field(default=0, description="Number of modules importing this")
    pagerank: float = Field(default=0.0, description="PageRank importance score")
    betweenness: float = Field(default=0.0, description="Betweenness centrality score")
    # Phase 1 metrics
    cycle_count: int = Field(default=0, description="Number of cycles this node participates in")
    instability: float = Field(default=0.0, description="Ce = out_degree/(in+out); 0=stable, 1=unstable")
    depth: int = Field(default=0, description="Shortest distance from nearest entry point (no incoming edges)")
    # Phase 2 metrics
    closeness: float = Field(default=0.0, description="Closeness centrality (average distance to others)")
    eigenvector: float = Field(default=0.0, description="Eigenvector centrality (influence)")
    external_ratio: float = Field(default=0.0, description="Share of this node's imports that are external (0-1)")


class Edge(BaseModel):
    """Graph edge representing an import relationship."""

    source: str = Field(..., description="Source node ID")
    target: str = Field(..., description="Target node ID")
    import_type: str = Field(..., description="Type of import")
    line_numbers: list[int] = Field(
        default_factory=list, description="Line numbers where import occurs"
    )


class CycleDetail(BaseModel):
    """Detailed information about a circular dependency."""

    nodes: list[str] = Field(..., description="Node IDs in the cycle")
    length: int = Field(..., description="Number of nodes in the cycle")
    severity: Literal["high", "medium", "low"] = Field(..., description="Severity level")
    edges: list[dict] = Field(default_factory=list, description="Edge details in the cycle")


class ImportStatistics(BaseModel):
    """Statistics about imports in the project."""

    avg_imports_per_file: float = Field(..., description="Average imports per file")
    max_imports_in_file: int = Field(..., description="Maximum imports in a single file")
    max_imports_file: str = Field(..., description="File with most imports")
    most_imported_module: str = Field(..., description="Most imported module")
    most_imported_count: int = Field(..., description="Import count of most imported module")
    hub_modules: list[tuple[str, float]] = Field(
        default_factory=list, description="Top hub modules by PageRank"
    )


class GraphMetrics(BaseModel):
    """Analysis metrics for the dependency graph."""

    total_files: int
    total_imports: int
    circular_dependencies: list[list[str]]
    max_import_depth: int
    isolated_modules: list[str]
    cycle_details: list[CycleDetail] = Field(
        default_factory=list, description="Detailed cycle information"
    )
    statistics: ImportStatistics | None = Field(None, description="Import statistics")
    # Phase 1: graph-level metrics
    graph_density: float = Field(default=0.0, description="Edges / possible edges (0-1)")
    total_cycles: int = Field(default=0, description="Total number of circular dependencies")
    # Phase 2: project-level
    external_edges_ratio: float = Field(default=0.0, description="Share of all edges that point to external nodes (0-1)")


class FilePreview(BaseModel):
    """File content preview."""

    file_path: str = Field(..., description="Path to the file")
    content: str = Field(..., description="File content (truncated if large)")
    line_count: int = Field(..., description="Total number of lines")
    size_bytes: int = Field(..., description="File size in bytes")
    imports: list[ImportInfo] = Field(default_factory=list, description="Imports in this file")


class AnalysisResult(BaseModel):
    """Complete analysis result."""

    id: str = Field(..., description="Unique analysis ID")
    project_path: str = Field(..., description="Analyzed project path")
    nodes: list[Node] = Field(..., description="Graph nodes")
    edges: list[Edge] = Field(..., description="Graph edges")
    metrics: GraphMetrics = Field(..., description="Analysis metrics")
    warnings: list[str] = Field(default_factory=list, description="Analysis warnings")


class InsightsResponse(BaseModel):
    """Response model for the insights endpoint."""

    health_score: int = Field(..., ge=0, le=100, description="Overall health score 0-100")
    health_status: str = Field(..., description="Status label (e.g. excellent, good, fair, poor)")
    issues: list[dict[str, Any]] = Field(default_factory=list, description="Detected issues")
    recommendations: list[dict[str, Any]] = Field(
        default_factory=list, description="Recommendations"
    )
    statistics: dict[str, Any] = Field(default_factory=dict, description="Import statistics")


class ErrorResponse(BaseModel):
    """Error response model."""

    detail: str = Field(..., description="Error message")
    error_type: str = Field(..., description="Type of error")
