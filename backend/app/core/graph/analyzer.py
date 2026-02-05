"""Graph analyzer for computing metrics and detecting patterns."""

import networkx as nx

from app.api.models import GraphMetrics
from app.core.logging import get_logger

logger = get_logger(__name__)


class GraphAnalyzer:
    """Analyze dependency graphs for patterns and metrics."""

    def __init__(self, graph: nx.DiGraph):
        """Initialize analyzer.

        Args:
            graph: NetworkX directed graph to analyze
        """
        self.graph = graph
        self._pagerank_cache = None
        self._betweenness_cache = None
        self._cycle_participation_cache = None
        self._node_depths_cache = None
        self._closeness_cache = None
        self._eigenvector_cache = None

    def compute_node_importance(self, node: str) -> dict[str, float]:
        """Compute importance scores for a node.

        Args:
            node: Node ID

        Returns:
            Dictionary with importance metrics
        """
        pagerank = self.get_pagerank_scores()
        betweenness = self.get_betweenness_centrality()

        return {
            "pagerank": pagerank.get(node, 0.0),
            "betweenness": betweenness.get(node, 0.0),
            "in_degree": self.graph.in_degree(node),
            "out_degree": self.graph.out_degree(node),
        }

    def get_pagerank_scores(self) -> dict[str, float]:
        """Calculate PageRank scores for all nodes.

        Edge direction: A -> B means A imports B, so B receives rank from A.
        High PageRank = heavily imported (many dependents).

        Returns:
            Dictionary mapping node IDs to PageRank scores (sum ≈ 1.0)
        """
        if self._pagerank_cache is not None:
            return self._pagerank_cache

        n = self.graph.number_of_nodes()
        if n == 0:
            self._pagerank_cache = {}
            return self._pagerank_cache
        if n == 1:
            node = list(self.graph.nodes())[0]
            self._pagerank_cache = {node: 1.0}
            return self._pagerank_cache

        try:
            # alpha=0.85: damping factor; follow edges (importer -> imported)
            self._pagerank_cache = nx.pagerank(
                self.graph,
                alpha=0.85,
                max_iter=100,
                tol=1.0e-6,
            )
            return self._pagerank_cache
        except Exception as e:
            logger.warning("PageRank failed, using uniform scores", error=str(e))
            self._pagerank_cache = {node: 1.0 / n for node in self.graph.nodes()}
            return self._pagerank_cache

    def get_betweenness_centrality(self) -> dict[str, float]:
        """Calculate betweenness centrality for all nodes.

        Nodes that lie on many shortest paths (between importers and imported) get higher scores.
        For large graphs (>2000 nodes), uses an approximation for performance.

        Returns:
            Dictionary mapping node IDs to betweenness centrality scores (normalized 0-1)
        """
        if self._betweenness_cache is not None:
            return self._betweenness_cache

        nodes = list(self.graph.nodes())
        if not nodes:
            self._betweenness_cache = {}
            return self._betweenness_cache

        try:
            # For large graphs, approximation is much faster
            if len(nodes) > 2000:
                k = min(len(nodes), 500)  # Sample a subset of nodes
                logger.info(f"Using approximated betweenness centrality (k={k}) for large graph.")
                self._betweenness_cache = nx.betweenness_centrality(
                    self.graph,
                    k=k,
                    normalized=True,
                )
            else:
                self._betweenness_cache = nx.betweenness_centrality(
                    self.graph,
                    normalized=True,
                )
            return self._betweenness_cache
        except Exception as e:
            logger.warning("Betweenness centrality failed, using zeros", error=str(e))
            self._betweenness_cache = {node: 0.0 for node in nodes}
            return self._betweenness_cache

    def get_hub_modules(self, top_n: int = 5) -> list[tuple[str, float]]:
        """Identify hub modules (high importance/centrality).

        Args:
            top_n: Number of top hubs to return

        Returns:
            List of (node_id, score) tuples
        """
        pagerank = self.get_pagerank_scores()
        sorted_nodes = sorted(pagerank.items(), key=lambda x: x[1], reverse=True)
        return sorted_nodes[:top_n]

    def get_closeness_centrality(self) -> dict[str, float]:
        """Closeness centrality: how central a node is as a dependency target.

        Uses reverse graph so that "how quickly can others reach you" = high for
        heavily imported modules. Original graph gives "how quickly you reach others".
        Skipped for large graphs (>2000 nodes) for performance.

        Returns:
            Dictionary mapping node ID to score (0-1). Zeros on failure or unreachable.
        """
        if self._closeness_cache is not None:
            return self._closeness_cache

        nodes = list(self.graph.nodes())
        if not nodes:
            self._closeness_cache = {}
            return self._closeness_cache

        # Skip for large graphs as it's slow and less critical than other metrics
        if len(nodes) > 2000:
            logger.info("Skipping closeness centrality for large graph.")
            self._closeness_cache = {n: 0.0 for n in nodes}
            return self._closeness_cache

        try:
            # Reverse graph: high closeness = easily reached from many (heavily imported)
            rev = self.graph.reverse()
            self._closeness_cache = nx.closeness_centrality(rev)
            return self._closeness_cache
        except Exception as e:
            logger.warning("Closeness centrality failed, using zeros", error=str(e))
            self._closeness_cache = {n: 0.0 for n in nodes}
            return self._closeness_cache

    def get_eigenvector_centrality(self) -> dict[str, float]:
        """Eigenvector centrality: importance as a dependency target.

        Uses reverse graph so "imported by important modules" = high score.
        Falls back to in-degree centrality if power iteration does not converge
        (e.g. disconnected graph).

        Returns:
            Dictionary mapping node ID to score. Fallback to in-degree normalized on failure.
        """
        if self._eigenvector_cache is not None:
            return self._eigenvector_cache

        nodes = list(self.graph.nodes())
        if not nodes:
            self._eigenvector_cache = {}
            return self._eigenvector_cache

        # Try reverse graph first: high score = imported by important modules
        try:
            rev = self.graph.reverse()
            self._eigenvector_cache = nx.eigenvector_centrality(
                rev,
                max_iter=5000,
                tol=1.0e-6,
            )
            return self._eigenvector_cache
        except (nx.PowerIterationFailedConvergence, nx.NetworkXError) as e:
            logger.debug(
                "Eigenvector centrality did not converge, using in-degree centrality",
                error=str(e),
            )
        except Exception as e:
            logger.warning(
                "Eigenvector centrality failed, using in-degree centrality",
                error=str(e),
            )

        # Fallback: in-degree centrality (normalized) — "how many modules import you"
        in_degrees = {n: self.graph.in_degree(n) for n in nodes}
        max_deg = max(in_degrees.values()) or 1
        self._eigenvector_cache = {
            n: in_degrees[n] / max_deg for n in nodes
        }
        return self._eigenvector_cache

    def get_external_ratio_per_node(self) -> dict[str, float]:
        """For each node, fraction of out-edges that point to external nodes (0-1).

        Returns:
            Dictionary mapping node ID to ratio.
        """
        result: dict[str, float] = {}
        for node in self.graph.nodes():
            out_degree = self.graph.out_degree(node)
            if out_degree == 0:
                result[node] = 0.0
                continue
            external_count = 0
            for successor in self.graph.successors(node):
                if self.graph.nodes[successor].get("node_type") == "external":
                    external_count += 1
            result[node] = round(external_count / out_degree, 4)
        return result

    def get_cycle_participation(self) -> dict[str, int]:
        """Count how many simple cycles each node participates in.

        Returns:
            Dictionary mapping node ID to cycle count.
        """
        if self._cycle_participation_cache is not None:
            return self._cycle_participation_cache
        try:
            cycles = list(nx.simple_cycles(self.graph))
            cycles = [c for c in cycles if len(c) > 1]
            counts: dict[str, int] = {n: 0 for n in self.graph.nodes()}
            for cycle in cycles:
                for node in cycle:
                    counts[node] = counts.get(node, 0) + 1
            self._cycle_participation_cache = counts
            return counts
        except Exception:
            self._cycle_participation_cache = {n: 0 for n in self.graph.nodes()}
            return self._cycle_participation_cache

    def get_node_depths(self) -> dict[str, int]:
        """Shortest distance from each node to nearest entry point (in_degree 0).

        Returns:
            Dictionary mapping node ID to depth (0 = entry point).
        """
        if self._node_depths_cache is not None:
            return self._node_depths_cache
        result: dict[str, int] = {}
        try:
            entry_points = [n for n in self.graph.nodes() if self.graph.in_degree(n) == 0]
            if not entry_points:
                result = {n: 0 for n in self.graph.nodes()}
            else:
                # Reverse graph: we want distance FROM entries TO each node
                for node in self.graph.nodes():
                    min_depth = -1
                    for entry in entry_points:
                        try:
                            length = nx.shortest_path_length(self.graph, entry, node)
                            min_depth = length if min_depth < 0 else min(min_depth, length)
                        except (nx.NetworkXNoPath, nx.NodeNotFound):
                            continue
                    result[node] = max(0, min_depth)
            self._node_depths_cache = result
            return result
        except Exception:
            self._node_depths_cache = {n: 0 for n in self.graph.nodes()}
            return self._node_depths_cache

    def get_cycle_details(self, cycle: list[str]) -> dict:
        """Get detailed information about a circular dependency.

        Args:
            cycle: List of node IDs forming a cycle

        Returns:
            Dictionary with cycle details
        """
        cycle_edges = []
        for i in range(len(cycle)):
            source = cycle[i]
            target = cycle[(i + 1) % len(cycle)]
            if self.graph.has_edge(source, target):
                edge_data = self.graph[source][target]
                cycle_edges.append(
                    {
                        "source": source,
                        "target": target,
                        "import_type": edge_data.get("import_type", "unknown"),
                        "line_numbers": edge_data.get("line_numbers", []),
                    }
                )

        return {
            "nodes": cycle,
            "length": len(cycle),
            "edges": cycle_edges,
            "severity": "high" if len(cycle) <= 3 else "medium",
        }

    def compute_metrics(self) -> GraphMetrics:
        """Compute comprehensive graph metrics.

        Returns:
            GraphMetrics object
        """
        # Count internal modules (exclude external dependencies)
        internal_nodes = [
            n for n in self.graph.nodes() if self.graph.nodes[n].get("node_type") != "external"
        ]

        # Total imports (edges)
        total_imports = self.graph.number_of_edges()

        # Find circular dependencies
        circular_deps = self._find_circular_dependencies()

        # Calculate maximum import depth
        max_depth = self._calculate_max_depth()

        # Find isolated modules (no imports and not imported)
        isolated = [
            n
            for n in internal_nodes
            if self.graph.in_degree(n) == 0 and self.graph.out_degree(n) == 0
        ]

        # Get detailed cycle information
        cycle_details = [self.get_cycle_details(cycle) for cycle in circular_deps[:10]]

        # Compute statistics
        statistics = self._compute_statistics(internal_nodes)

        # Phase 1: graph density and total cycles
        n = self.graph.number_of_nodes()
        possible_edges = n * (n - 1) if n > 1 else 0
        graph_density = (
            total_imports / possible_edges if possible_edges > 0 else 0.0
        )

        # Phase 2: share of edges pointing to external nodes
        external_edges = sum(
            1
            for _u, v in self.graph.edges()
            if self.graph.nodes[v].get("node_type") == "external"
        )
        external_edges_ratio = (
            external_edges / total_imports if total_imports > 0 else 0.0
        )

        # Enriched: entry points (internal nodes with no incoming edges)
        entry_points_count = sum(
            1 for n in internal_nodes if self.graph.in_degree(n) == 0
        )
        # Distinct external packages referenced
        external_node_count = sum(
            1 for n in self.graph.nodes()
            if self.graph.nodes[n].get("node_type") == "external"
        )
        # Edges between internal modules only
        internal_edges = sum(
            1 for u, v in self.graph.edges()
            if self.graph.nodes[u].get("node_type") != "external"
            and self.graph.nodes[v].get("node_type") != "external"
        )
        # Cycle length stats
        cycle_lengths = [len(c) for c in circular_deps]
        avg_cycle_length = (
            sum(cycle_lengths) / len(cycle_lengths) if cycle_lengths else 0.0
        )
        max_cycle_length = max(cycle_lengths) if cycle_lengths else 0
        # Largest strongly connected component (internal nodes only for "tangled core")
        largest_scc_size = self._largest_scc_size(internal_nodes)

        return GraphMetrics(
            total_files=len(internal_nodes),
            total_imports=total_imports,
            circular_dependencies=circular_deps,
            max_import_depth=max_depth,
            isolated_modules=isolated,
            cycle_details=cycle_details,
            statistics=statistics,
            graph_density=round(graph_density, 4),
            total_cycles=len(circular_deps),
            external_edges_ratio=round(external_edges_ratio, 4),
            entry_points_count=entry_points_count,
            external_node_count=external_node_count,
            internal_edges=internal_edges,
            avg_cycle_length=round(avg_cycle_length, 1),
            max_cycle_length=max_cycle_length,
            largest_scc_size=largest_scc_size,
        )

    def _compute_statistics(self, internal_nodes: list[str]):
        """Compute import statistics.

        Args:
            internal_nodes: List of internal node IDs

        Returns:
            ImportStatistics object
        """
        from app.api.models import ImportStatistics, ModuleCount

        if not internal_nodes:
            return ImportStatistics(
                avg_imports_per_file=0.0,
                max_imports_in_file=0,
                max_imports_file="",
                most_imported_module="",
                most_imported_count=0,
                hub_modules=[],
                top_importers=[],
                top_imported=[],
            )

        # Calculate average imports per file
        import_counts = [self.graph.out_degree(n) for n in internal_nodes]
        avg_imports = sum(import_counts) / len(import_counts) if import_counts else 0.0

        # Find file with most imports
        max_imports = 0
        max_imports_file = ""
        for node in internal_nodes:
            count = self.graph.out_degree(node)
            if count > max_imports:
                max_imports = count
                max_imports_file = node

        # Find most imported module
        most_imported = ""
        most_imported_count = 0
        for node in internal_nodes:
            count = self.graph.in_degree(node)
            if count > most_imported_count:
                most_imported_count = count
                most_imported = node

        # Get hub modules
        hub_modules = self.get_hub_modules(5)

        # Top importers (fan-out) and top imported (fan-in)
        top_importers_raw = self.get_modules_with_most_imports(5)
        top_imported_raw = self.get_most_imported_modules(5)
        top_importers = [ModuleCount(module=m, count=c) for m, c in top_importers_raw]
        top_imported = [ModuleCount(module=m, count=float(c)) for m, c in top_imported_raw]

        return ImportStatistics(
            avg_imports_per_file=round(avg_imports, 2),
            max_imports_in_file=max_imports,
            max_imports_file=max_imports_file,
            most_imported_module=most_imported,
            most_imported_count=most_imported_count,
            hub_modules=hub_modules,
            top_importers=top_importers,
            top_imported=top_imported,
        )

    def _largest_scc_size(self, internal_nodes: list[str]) -> int:
        """Size of largest strongly connected component (internal nodes only).

        Indicates how large the 'tangled core' of the dependency graph is.

        Returns:
            Number of nodes in the largest SCC.
        """
        if not internal_nodes:
            return 0
        try:
            subgraph = self.graph.subgraph(internal_nodes)
            sccs = list(nx.strongly_connected_components(subgraph))
            return max(len(scc) for scc in sccs) if sccs else 0
        except Exception:
            return 0

    def _find_circular_dependencies(self) -> list[list[str]]:
        """Find all circular dependencies in the graph.

        Returns:
            List of cycles (each cycle is a list of node IDs)
        """
        try:
            # Find all simple cycles
            cycles = list(nx.simple_cycles(self.graph))
            # Filter out trivial cycles and sort by length
            cycles = [cycle for cycle in cycles if len(cycle) > 1]
            cycles.sort(key=len)
            return cycles
        except Exception:
            return []

    def _calculate_max_depth(self) -> int:
        """Calculate the maximum import depth in the graph.

        Returns:
            Maximum depth (number of edges in longest path)
        """
        if self.graph.number_of_nodes() == 0:
            return 0

        try:
            # Find nodes with no incoming edges (entry points)
            entry_points = [n for n in self.graph.nodes() if self.graph.in_degree(n) == 0]

            if not entry_points:
                # If there are no entry points, graph might be entirely circular
                # or all nodes have dependencies
                return 0

            max_depth = 0
            for entry in entry_points:
                # Find all paths from this entry point
                try:
                    lengths = nx.single_source_shortest_path_length(self.graph, entry)
                    if lengths:
                        max_depth = max(max_depth, max(lengths.values()))
                except Exception:
                    continue

            return max_depth

        except Exception:
            return 0

    def get_most_imported_modules(self, top_n: int = 10) -> list[tuple[str, int]]:
        """Get the most imported modules.

        Args:
            top_n: Number of top modules to return

        Returns:
            List of (node_id, import_count) tuples
        """
        import_counts = [(node, self.graph.in_degree(node)) for node in self.graph.nodes()]
        import_counts.sort(key=lambda x: x[1], reverse=True)
        return import_counts[:top_n]

    def get_modules_with_most_imports(self, top_n: int = 10) -> list[tuple[str, int]]:
        """Get modules that import the most other modules.

        Args:
            top_n: Number of top modules to return

        Returns:
            List of (node_id, import_count) tuples
        """
        import_counts = [(node, self.graph.out_degree(node)) for node in self.graph.nodes()]
        import_counts.sort(key=lambda x: x[1], reverse=True)
        return import_counts[:top_n]
