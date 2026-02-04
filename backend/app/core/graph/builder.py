"""Graph builder for constructing dependency graphs from imports."""

from pathlib import Path
from typing import TYPE_CHECKING

import networkx as nx

from app.api.models import Edge, ImportInfo, Node
from app.core.graph.resolvers import get_resolver
from app.core.graph.version_resolver import get_external_package_version

if TYPE_CHECKING:
    from app.api.models import AnalysisResult


class GraphBuilder:
    """Build dependency graphs from import information."""

    def __init__(self, project_root: Path):
        """Initialize graph builder.

        Args:
            project_root: Root directory of the project
        """
        self.project_root = Path(project_root) if project_root else Path(".")
        self.graph = nx.DiGraph()
        self.import_data: dict[str, list[ImportInfo]] = {}

    @classmethod
    def from_graph(cls, graph: nx.DiGraph, project_root: str | Path = ".") -> "GraphBuilder":
        """Create a GraphBuilder from an existing NetworkX graph (e.g. after import).

        Args:
            graph: Existing directed graph with node/edge attributes
            project_root: Project path for display

        Returns:
            GraphBuilder instance
        """
        instance = cls(Path(project_root) if project_root else Path("."))
        instance.graph = graph
        return instance

    @classmethod
    def from_analysis_result(cls, analysis: "AnalysisResult") -> "GraphBuilder":
        """Create a GraphBuilder from a cached AnalysisResult (e.g. for export from disk).

        Args:
            analysis: Cached analysis with nodes and edges

        Returns:
            GraphBuilder instance whose graph can be used for GraphML/GEXF export
        """
        graph = nx.DiGraph()
        for n in analysis.nodes:
            attrs = {"file_path": n.file_path, "node_type": n.node_type}
            if getattr(n, "external_kind", None) is not None:
                attrs["external_kind"] = n.external_kind
            graph.add_node(n.id, **attrs)
        for e in analysis.edges:
            # GraphML/GEXF only support scalar types; store line_numbers as comma-separated string
            line_numbers_str = ",".join(map(str, e.line_numbers)) if e.line_numbers else ""
            graph.add_edge(
                e.source,
                e.target,
                import_type=e.import_type,
                line_numbers=line_numbers_str,
            )
        return cls.from_graph(graph, analysis.project_path)

    def _canonical_node_id(self, source_file: str, import_module: str) -> str:
        """Resolve import to a canonical node ID (file path for internal, module name for external).

        Ensures that `import x`, `from x import y`, `import .x`, `from .x import y` etc.
        that refer to the same file are represented as a single node (the resolved path).

        Args:
            source_file: File containing the import
            import_module: Raw imported module name (e.g. "x", ".x", "pkg.mod")

        Returns:
            Canonical node ID: resolved absolute path for project files, else import_module for external
        """
        resolved = self._resolve_import_to_file(source_file, import_module)
        return resolved if resolved else import_module

    def add_imports(self, imports: list[ImportInfo]):
        """Add imports to the graph.

        Uses canonical node IDs so that different import forms (import x, from x import y,
        .x, from .x import y) that refer to the same file are merged into one node.
        """
        for import_info in imports:
            source = import_info.source_file
            raw_target = import_info.imported_module

            # Canonical target: same file => same node ID (resolved path for internal, name for external)
            target = self._canonical_node_id(source, raw_target)

            # Store import data for later use (keyed by raw module for debugging)
            if source not in self.import_data:
                self.import_data[source] = []
            self.import_data[source].append(import_info)

            # Add nodes if they don't exist
            if not self.graph.has_node(source):
                self.graph.add_node(source, node_type="module", file_path=source)

            # Determine if target is internal (project file) or external (library)
            target_path = self._resolve_import_to_file(source, raw_target)
            node_type = "module" if target_path else "external"

            if not self.graph.has_node(target):
                attrs: dict = {"node_type": node_type, "file_path": target_path or raw_target}
                if node_type == "external":
                    resolver = get_resolver(source, self.project_root)
                    attrs["external_kind"] = (
                        "stdlib" if resolver.is_stdlib(source, raw_target) else "package"
                    )
                self.graph.add_node(target, **attrs)

            # Add or update edge (source -> canonical target)
            if self.graph.has_edge(source, target):
                # Update existing edge with additional line number
                edge_data = self.graph[source][target]
                if "line_numbers" not in edge_data:
                    edge_data["line_numbers"] = []
                edge_data["line_numbers"].append(import_info.line_number)
            else:
                # Create new edge
                self.graph.add_edge(
                    source,
                    target,
                    import_type=import_info.import_type,
                    line_numbers=[import_info.line_number],
                )

    def _resolve_import_to_file(self, source_file: str, import_module: str) -> str | None:
        """Try to resolve an import to an actual file in the project.

        Uses language-specific resolvers based on source file extension.

        Args:
            source_file: File containing the import
            import_module: Module being imported (e.g. "x", ".x", "./utils", "@/components")

        Returns:
            Absolute resolved file path or None if external
        """
        resolver = get_resolver(source_file, self.project_root)
        return resolver.resolve_import(source_file, import_module)

    def get_nodes(
        self,
        pagerank_scores: dict[str, float] | None = None,
        betweenness_scores: dict[str, float] | None = None,
        cycle_participation: dict[str, int] | None = None,
        node_depths: dict[str, int] | None = None,
        closeness_scores: dict[str, float] | None = None,
        eigenvector_scores: dict[str, float] | None = None,
        external_ratio_map: dict[str, float] | None = None,
    ) -> list[Node]:
        """Get all nodes in the graph.

        Args:
            pagerank_scores: Optional PageRank scores for nodes
            betweenness_scores: Optional betweenness centrality scores
            cycle_participation: Optional cycle count per node (Phase 1)
            node_depths: Optional depth from entry point per node (Phase 1)
            closeness_scores: Optional closeness centrality (Phase 2)
            eigenvector_scores: Optional eigenvector centrality (Phase 2)
            external_ratio_map: Optional external-import ratio per node (Phase 2)

        Returns:
            List of Node objects
        """
        nodes = []
        pagerank = pagerank_scores or {}
        betweenness = betweenness_scores or {}
        cycle_count_map = cycle_participation or {}
        depth_map = node_depths or {}
        closeness = closeness_scores or {}
        eigenvector = eigenvector_scores or {}
        external_ratio = external_ratio_map or {}

        for node_id in self.graph.nodes():
            node_data = self.graph.nodes[node_id]

            # Calculate import statistics
            import_count = self.graph.out_degree(node_id)
            imported_by_count = self.graph.in_degree(node_id)

            # Instability: Ce = out_degree / (in_degree + out_degree), 0 if both 0
            total_degree = import_count + imported_by_count
            instability = (
                import_count / total_degree if total_degree > 0 else 0.0
            )

            # Create display label (just the filename or module name)
            if node_data["node_type"] == "external":
                label = node_id
            else:
                label = Path(node_id).name

            external_kind = node_data.get("external_kind")  # "stdlib" | "package" | None (legacy)
            version: str | None = None
            if node_data["node_type"] == "external" and external_kind == "package":
                version = get_external_package_version(node_id)

            nodes.append(
                Node(
                    id=node_id,
                    label=label,
                    file_path=node_data["file_path"],
                    node_type=node_data["node_type"],
                    external_kind=external_kind,
                    version=version,
                    import_count=import_count,
                    imported_by_count=imported_by_count,
                    pagerank=pagerank.get(node_id, 0.0),
                    betweenness=betweenness.get(node_id, 0.0),
                    cycle_count=cycle_count_map.get(node_id, 0),
                    instability=round(instability, 4),
                    depth=depth_map.get(node_id, 0),
                    closeness=closeness.get(node_id, 0.0),
                    eigenvector=eigenvector.get(node_id, 0.0),
                    external_ratio=external_ratio.get(node_id, 0.0),
                )
            )

        return nodes

    def get_edges(self) -> list[Edge]:
        """Get all edges in the graph.

        Returns:
            List of Edge objects
        """
        edges = []
        for source, target, data in self.graph.edges(data=True):
            edges.append(
                Edge(
                    source=source,
                    target=target,
                    import_type=data.get("import_type", "module"),
                    line_numbers=data.get("line_numbers", []),
                )
            )

        return edges

    def get_graph(self) -> nx.DiGraph:
        """Get the NetworkX graph.

        Returns:
            NetworkX directed graph
        """
        return self.graph
