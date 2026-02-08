"""Impact analysis for dependency graphs.

This module provides tools to analyze the impact of changing a file,
including forward impact (files that depend on it) and backward impact
(files it depends on).
"""

import networkx as nx
from typing import Literal

from app.api.models import AffectedFile, ImpactReport
from app.core.logging import get_logger

logger = get_logger(__name__)


class ImpactAnalyzer:
    """Analyze the impact of changing a file in the dependency graph."""

    def __init__(self, graph: nx.DiGraph, pagerank_scores: dict[str, float] | None = None):
        """Initialize impact analyzer.

        Args:
            graph: NetworkX directed graph where edges go from importer to imported
                   (A -> B means A imports B)
            pagerank_scores: Optional pre-computed PageRank scores
        """
        self.graph = graph
        self._pagerank = pagerank_scores or {}

    def analyze_impact(
        self,
        target_node: str,
        depth: int = -1,
    ) -> ImpactReport:
        """Analyze the impact of changing a file.

        Args:
            target_node: Node ID of the file to analyze
            depth: Maximum depth to traverse (-1 for unlimited)

        Returns:
            ImpactReport with forward and backward impact analysis
        """
        if target_node not in self.graph:
            # Return empty report for unknown nodes
            return ImpactReport(
                target_file=target_node,
                affected_count=0,
                forward_impact=[],
                backward_impact=[],
                impact_score=0.0,
                risk_level="low",
                dependency_chains=[],
            )

        # Forward impact: files that import this file (predecessors in our graph)
        # In our graph, A -> B means A imports B, so predecessors of B are files importing B
        forward_nodes = self._get_reachable_nodes(
            target_node, depth, direction="predecessors"
        )
        forward_impact = self._create_affected_files(forward_nodes)

        # Backward impact: files that this file imports (successors in our graph)
        # In our graph, A -> B means A imports B, so successors of A are files A imports
        backward_nodes = self._get_reachable_nodes(
            target_node, depth, direction="successors"
        )
        backward_impact = self._create_affected_files(backward_nodes)

        # Calculate impact score
        affected_count = len(forward_nodes)
        impact_score = self._calculate_impact_score(
            target_node, forward_nodes, backward_nodes
        )
        risk_level = self._get_risk_level(impact_score)

        # Get example dependency chains (paths from entry points to this file)
        dependency_chains = self._get_dependency_chains(target_node, max_chains=3)

        return ImpactReport(
            target_file=target_node,
            affected_count=affected_count,
            forward_impact=forward_impact,
            backward_impact=backward_impact,
            impact_score=impact_score,
            risk_level=risk_level,
            dependency_chains=dependency_chains,
        )

    def _get_reachable_nodes(
        self,
        start_node: str,
        depth: int,
        direction: Literal["predecessors", "successors"],
    ) -> dict[str, int]:
        """Get all nodes reachable from start_node with their distances.

        Args:
            start_node: Starting node
            depth: Max depth (-1 for unlimited)
            direction: "predecessors" (files importing this) or "successors" (files this imports)

        Returns:
            Dict mapping node ID to distance from start_node
        """
        result = {}
        visited = {start_node}
        current_level = [start_node]
        current_depth = 0

        while current_level and (depth == -1 or current_depth < depth):
            next_level = []
            current_depth += 1

            for node in current_level:
                if direction == "predecessors":
                    neighbors = list(self.graph.predecessors(node))
                else:
                    neighbors = list(self.graph.successors(node))

                for neighbor in neighbors:
                    if neighbor not in visited:
                        visited.add(neighbor)
                        result[neighbor] = current_depth
                        next_level.append(neighbor)

            current_level = next_level

        return result

    def _create_affected_files(
        self, nodes_with_distance: dict[str, int]
    ) -> list[AffectedFile]:
        """Convert node dict to AffectedFile list, sorted by distance then pagerank."""
        affected = []
        for node_id, distance in nodes_with_distance.items():
            pagerank = self._pagerank.get(node_id, 0.0)
            imported_by = self.graph.in_degree(node_id) if node_id in self.graph else 0

            affected.append(
                AffectedFile(
                    file_path=node_id,
                    distance=distance,
                    impact_type="direct" if distance == 1 else "transitive",
                    pagerank=pagerank,
                    imported_by_count=imported_by,
                )
            )

        # Sort by distance (closer first), then by pagerank (more important first)
        affected.sort(key=lambda x: (x.distance, -x.pagerank))
        return affected

    def _calculate_impact_score(
        self,
        target_node: str,
        forward_nodes: dict[str, int],
        backward_nodes: dict[str, int],
    ) -> float:
        """Calculate impact score (0-100) based on affected files and importance.

        Factors:
        - Number of files directly affected (weight: 40%)
        - Number of files transitively affected (weight: 20%)
        - PageRank of target file (weight: 20%)
        - Total PageRank of affected files (weight: 20%)
        """
        total_internal = sum(
            1 for n in self.graph.nodes()
            if not self.graph.nodes[n].get("external", False)
        )
        if total_internal == 0:
            return 0.0

        # Direct impact: files at distance 1
        direct_count = sum(1 for d in forward_nodes.values() if d == 1)
        direct_ratio = min(direct_count / max(total_internal, 1), 1.0)

        # Transitive impact: all affected files
        transitive_ratio = min(len(forward_nodes) / max(total_internal, 1), 1.0)

        # Target's own importance
        target_pagerank = self._pagerank.get(target_node, 0.0)
        # Normalize PageRank (typical range is 0-0.5 for important modules)
        target_importance = min(target_pagerank * 10, 1.0)

        # Affected files' combined importance
        affected_pagerank = sum(
            self._pagerank.get(n, 0.0) for n in forward_nodes.keys()
        )
        affected_importance = min(affected_pagerank * 5, 1.0)

        # Weighted score
        score = (
            direct_ratio * 40
            + transitive_ratio * 20
            + target_importance * 20
            + affected_importance * 20
        )

        return round(min(score, 100.0), 1)

    def _get_risk_level(
        self, impact_score: float
    ) -> Literal["low", "medium", "high", "critical"]:
        """Convert impact score to risk level."""
        if impact_score >= 70:
            return "critical"
        elif impact_score >= 40:
            return "high"
        elif impact_score >= 15:
            return "medium"
        else:
            return "low"

    def _get_dependency_chains(
        self, target_node: str, max_chains: int = 3
    ) -> list[list[str]]:
        """Get example dependency chains from entry points to target.

        Entry points are nodes with no incoming edges (in_degree = 0).
        """
        # Find entry points (internal nodes with no incoming edges)
        entry_points = [
            n for n in self.graph.nodes()
            if self.graph.in_degree(n) == 0
            and not self.graph.nodes[n].get("external", False)
        ]

        if not entry_points:
            return []

        chains = []
        for entry in entry_points[:max_chains * 2]:  # Check more entries than needed
            try:
                # Find path from entry to target
                # In our graph A -> B means A imports B
                # So path from entry to target follows import direction
                path = nx.shortest_path(self.graph, entry, target_node)
                if len(path) > 1:  # Skip trivial paths
                    chains.append(path)
                    if len(chains) >= max_chains:
                        break
            except nx.NetworkXNoPath:
                continue

        return chains

    def get_affected_files(self, target_node: str, depth: int = -1) -> list[str]:
        """Get a simple list of all files affected by changing target.

        This is a convenience method that returns just file paths.
        """
        if target_node not in self.graph:
            return []

        nodes = self._get_reachable_nodes(target_node, depth, "predecessors")
        return list(nodes.keys())

    def simulate_removal(self, target_node: str) -> dict:
        """Simulate what happens if this file is removed.

        Returns:
            Dict with broken_imports (files that would have broken imports)
            and orphaned_files (files that would become unreachable)
        """
        if target_node not in self.graph:
            return {"broken_imports": [], "orphaned_files": []}

        # Files that directly import the target would have broken imports
        broken_imports = list(self.graph.predecessors(target_node))

        # Create a copy of the graph without the target
        temp_graph = self.graph.copy()
        temp_graph.remove_node(target_node)

        # Find files that become orphaned (no path from entry points)
        entry_points = [
            n for n in temp_graph.nodes()
            if temp_graph.in_degree(n) == 0
            and not temp_graph.nodes[n].get("external", False)
        ]

        reachable = set()
        for entry in entry_points:
            reachable.update(nx.descendants(temp_graph, entry))
            reachable.add(entry)

        internal_nodes = [
            n for n in temp_graph.nodes()
            if not temp_graph.nodes[n].get("external", False)
        ]

        orphaned = [n for n in internal_nodes if n not in reachable]

        return {
            "broken_imports": broken_imports,
            "orphaned_files": orphaned,
        }
