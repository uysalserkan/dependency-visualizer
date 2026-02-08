"""Tests for Impact Analyzer."""

import pytest
import networkx as nx

from app.core.graph.impact import ImpactAnalyzer


@pytest.fixture
def simple_graph():
    """Create a simple dependency graph for testing.
    
    Structure:
        A -> B -> C -> D
        A -> E
        F -> B
        G (isolated)
    
    Edges mean "imports", so A imports B, B imports C, etc.
    """
    g = nx.DiGraph()
    # Add nodes
    for node in ["A", "B", "C", "D", "E", "F", "G"]:
        g.add_node(node, external=False)
    
    # Add edges (source imports target)
    g.add_edge("A", "B")
    g.add_edge("B", "C")
    g.add_edge("C", "D")
    g.add_edge("A", "E")
    g.add_edge("F", "B")
    
    return g


@pytest.fixture
def pagerank_scores():
    """Mock PageRank scores."""
    return {
        "A": 0.05,
        "B": 0.25,  # High - imported by A and F
        "C": 0.20,
        "D": 0.15,
        "E": 0.10,
        "F": 0.05,
        "G": 0.02,
    }


class TestImpactAnalyzerInit:
    """Test ImpactAnalyzer initialization."""
    
    def test_init_with_graph(self, simple_graph):
        """Test initializing with a graph."""
        analyzer = ImpactAnalyzer(simple_graph)
        assert analyzer.graph is simple_graph
    
    def test_init_with_pagerank(self, simple_graph, pagerank_scores):
        """Test initializing with PageRank scores."""
        analyzer = ImpactAnalyzer(simple_graph, pagerank_scores)
        assert analyzer._pagerank == pagerank_scores


class TestForwardImpact:
    """Test forward impact (files that depend on target)."""
    
    def test_forward_impact_leaf_node(self, simple_graph, pagerank_scores):
        """Leaf node (D) has forward impact - C, B, A, F all depend on it transitively.
        
        D has no successors (nothing it imports), but C imports D,
        so changing D affects C, and transitively B, A, F.
        """
        analyzer = ImpactAnalyzer(simple_graph, pagerank_scores)
        report = analyzer.analyze_impact("D")
        
        # D is imported by C (distance 1), B (distance 2), A and F (distance 3)
        assert report.affected_count == 4
        forward_paths = {f.file_path: f.distance for f in report.forward_impact}
        assert forward_paths.get("C") == 1
    
    def test_forward_impact_middle_node(self, simple_graph, pagerank_scores):
        """Middle node (C) is imported by B, which is imported by A and F."""
        analyzer = ImpactAnalyzer(simple_graph, pagerank_scores)
        report = analyzer.analyze_impact("C")
        
        # C is imported by B (distance 1)
        # B is imported by A and F (distance 2)
        assert report.affected_count == 3  # B, A, F
        
        # Check distances
        forward_paths = {f.file_path: f.distance for f in report.forward_impact}
        assert forward_paths.get("B") == 1
        assert forward_paths.get("A") == 2
        assert forward_paths.get("F") == 2
    
    def test_forward_impact_hub_node(self, simple_graph, pagerank_scores):
        """Hub node (B) is imported by A and F."""
        analyzer = ImpactAnalyzer(simple_graph, pagerank_scores)
        report = analyzer.analyze_impact("B")
        
        assert report.affected_count == 2  # A, F
        paths = {f.file_path: f.distance for f in report.forward_impact}
        assert paths.get("A") == 1
        assert paths.get("F") == 1


class TestBackwardImpact:
    """Test backward impact (files that target depends on)."""
    
    def test_backward_impact_root_node(self, simple_graph, pagerank_scores):
        """Root node (A) has no backward impact - nothing is imported by it that we don't count."""
        analyzer = ImpactAnalyzer(simple_graph, pagerank_scores)
        report = analyzer.analyze_impact("A")
        
        # A imports B and E
        # B imports C
        # C imports D
        backward_paths = {f.file_path: f.distance for f in report.backward_impact}
        assert "B" in backward_paths
        assert "E" in backward_paths
    
    def test_backward_impact_middle_node(self, simple_graph, pagerank_scores):
        """Middle node (B) imports C, which imports D."""
        analyzer = ImpactAnalyzer(simple_graph, pagerank_scores)
        report = analyzer.analyze_impact("B")
        
        backward_paths = {f.file_path: f.distance for f in report.backward_impact}
        assert backward_paths.get("C") == 1
        assert backward_paths.get("D") == 2


class TestImpactScore:
    """Test impact score calculation."""
    
    def test_isolated_node_low_score(self, simple_graph, pagerank_scores):
        """Isolated node (G) should have low impact score."""
        analyzer = ImpactAnalyzer(simple_graph, pagerank_scores)
        report = analyzer.analyze_impact("G")
        
        assert report.impact_score < 10
        assert report.risk_level == "low"
    
    def test_hub_node_high_score(self, simple_graph, pagerank_scores):
        """Hub node (B) should have higher impact score."""
        analyzer = ImpactAnalyzer(simple_graph, pagerank_scores)
        report = analyzer.analyze_impact("B")
        
        # B is imported by 2 files directly
        assert report.impact_score > 10
        assert report.risk_level in ["medium", "high", "critical"]


class TestDependencyChains:
    """Test dependency chain extraction."""
    
    def test_chains_to_leaf(self, simple_graph, pagerank_scores):
        """Test chains from entry points to leaf node."""
        analyzer = ImpactAnalyzer(simple_graph, pagerank_scores)
        report = analyzer.analyze_impact("D")
        
        # Entry points are A, F, G (no incoming edges)
        # Chains to D: A -> B -> C -> D, F -> B -> C -> D
        assert len(report.dependency_chains) > 0
        
        for chain in report.dependency_chains:
            assert chain[-1] == "D"  # Ends at target
            assert chain[0] in ["A", "F", "G"]  # Starts at entry point


class TestDepthLimit:
    """Test depth-limited traversal."""
    
    def test_depth_1_only_direct(self, simple_graph, pagerank_scores):
        """Depth 1 should only include direct dependencies."""
        analyzer = ImpactAnalyzer(simple_graph, pagerank_scores)
        report = analyzer.analyze_impact("C", depth=1)
        
        # Only B should be included (direct importer)
        assert report.affected_count == 1
        assert report.forward_impact[0].file_path == "B"
        assert report.forward_impact[0].distance == 1
    
    def test_depth_2_includes_transitive(self, simple_graph, pagerank_scores):
        """Depth 2 should include transitive dependencies."""
        analyzer = ImpactAnalyzer(simple_graph, pagerank_scores)
        report = analyzer.analyze_impact("C", depth=2)
        
        # B (distance 1) and A, F (distance 2) should be included
        assert report.affected_count == 3


class TestSimulateRemoval:
    """Test removal simulation."""
    
    def test_simulate_removal_hub(self, simple_graph, pagerank_scores):
        """Removing hub node B should break A and F imports."""
        analyzer = ImpactAnalyzer(simple_graph, pagerank_scores)
        result = analyzer.simulate_removal("B")
        
        assert "A" in result["broken_imports"]
        assert "F" in result["broken_imports"]
    
    def test_simulate_removal_leaf(self, simple_graph, pagerank_scores):
        """Removing leaf node D should only break C's import."""
        analyzer = ImpactAnalyzer(simple_graph, pagerank_scores)
        result = analyzer.simulate_removal("D")
        
        assert result["broken_imports"] == ["C"]


class TestAffectedFilesConvenience:
    """Test convenience method get_affected_files."""
    
    def test_get_affected_files_list(self, simple_graph, pagerank_scores):
        """Test simple list of affected files."""
        analyzer = ImpactAnalyzer(simple_graph, pagerank_scores)
        affected = analyzer.get_affected_files("C")
        
        assert isinstance(affected, list)
        assert "B" in affected
        assert "A" in affected
        assert "F" in affected


class TestUnknownNode:
    """Test handling of unknown nodes."""
    
    def test_unknown_node_returns_empty(self, simple_graph, pagerank_scores):
        """Unknown node should return empty report."""
        analyzer = ImpactAnalyzer(simple_graph, pagerank_scores)
        report = analyzer.analyze_impact("UNKNOWN")
        
        assert report.target_file == "UNKNOWN"
        assert report.affected_count == 0
        assert report.impact_score == 0.0
        assert report.risk_level == "low"
