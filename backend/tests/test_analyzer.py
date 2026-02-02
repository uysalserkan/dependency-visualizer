"""Tests for graph analyzer."""

import networkx as nx
import pytest

from app.core.graph.analyzer import GraphAnalyzer


@pytest.fixture
def simple_graph():
    """Create a simple test graph."""
    graph = nx.DiGraph()
    graph.add_node("a.py", node_type="module")
    graph.add_node("b.py", node_type="module")
    graph.add_node("c.py", node_type="module")
    graph.add_edge("a.py", "b.py")
    graph.add_edge("b.py", "c.py")
    return graph


@pytest.fixture
def circular_graph():
    """Create a graph with circular dependencies."""
    graph = nx.DiGraph()
    graph.add_node("a.py", node_type="module")
    graph.add_node("b.py", node_type="module")
    graph.add_node("c.py", node_type="module")
    graph.add_edge("a.py", "b.py")
    graph.add_edge("b.py", "c.py")
    graph.add_edge("c.py", "a.py")
    return graph


def test_compute_metrics_simple(simple_graph):
    """Test basic metrics computation."""
    analyzer = GraphAnalyzer(simple_graph)
    metrics = analyzer.compute_metrics()

    assert metrics.total_files == 3
    assert metrics.total_imports == 2
    assert metrics.circular_dependencies == []
    assert metrics.max_import_depth > 0


def test_find_circular_dependencies(circular_graph):
    """Test circular dependency detection."""
    analyzer = GraphAnalyzer(circular_graph)
    metrics = analyzer.compute_metrics()

    assert len(metrics.circular_dependencies) > 0
    cycle = metrics.circular_dependencies[0]
    assert len(cycle) == 3


def test_pagerank_scores(simple_graph):
    """Test PageRank calculation."""
    analyzer = GraphAnalyzer(simple_graph)
    scores = analyzer.get_pagerank_scores()

    assert len(scores) == 3
    assert all(0 <= score <= 1 for score in scores.values())
    assert sum(scores.values()) == pytest.approx(1.0, abs=0.01)


def test_betweenness_centrality(simple_graph):
    """Test betweenness centrality calculation."""
    analyzer = GraphAnalyzer(simple_graph)
    centrality = analyzer.get_betweenness_centrality()

    assert len(centrality) == 3
    assert all(score >= 0 for score in centrality.values())


def test_hub_modules(simple_graph):
    """Test hub module identification."""
    analyzer = GraphAnalyzer(simple_graph)
    hubs = analyzer.get_hub_modules(top_n=2)

    assert len(hubs) <= 2
    assert all(isinstance(score, float) for _, score in hubs)


def test_isolated_modules():
    """Test isolated module detection."""
    graph = nx.DiGraph()
    graph.add_node("a.py", node_type="module")
    graph.add_node("b.py", node_type="module")
    graph.add_node("isolated.py", node_type="module")
    graph.add_edge("a.py", "b.py")

    analyzer = GraphAnalyzer(graph)
    metrics = analyzer.compute_metrics()

    assert "isolated.py" in metrics.isolated_modules


def test_cycle_details(circular_graph):
    """Test detailed cycle information."""
    analyzer = GraphAnalyzer(circular_graph)
    cycles = analyzer._find_circular_dependencies()

    assert len(cycles) > 0
    cycle = cycles[0]

    details = analyzer.get_cycle_details(cycle)
    assert details["length"] == len(cycle)
    assert details["severity"] in ["high", "medium", "low"]
    assert len(details["edges"]) > 0


def test_empty_graph():
    """Test analyzer with empty graph."""
    graph = nx.DiGraph()
    analyzer = GraphAnalyzer(graph)
    metrics = analyzer.compute_metrics()

    assert metrics.total_files == 0
    assert metrics.total_imports == 0
    assert metrics.circular_dependencies == []
