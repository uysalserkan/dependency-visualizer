"""Parse exported graph files (JSON, GraphML, GEXF) into NetworkX graph and project path."""

import json
from io import BytesIO
from pathlib import Path

import networkx as nx

from app.core.exceptions import ValidationError
from app.core.logging import get_logger

logger = get_logger(__name__)


def parse_imported_graph(file_content: bytes, filename: str) -> tuple[nx.DiGraph, str]:
    """Parse an exported graph file into a NetworkX DiGraph and project path.

    Supports:
    - JSON: Our export format (elements.nodes, elements.edges, metadata.project_path)
    - GraphML: Standard GraphML XML
    - GEXF: Gephi Exchange Format

    Args:
        file_content: Raw file bytes
        filename: Original filename (used to detect format)

    Returns:
        Tuple of (graph, project_path). project_path is used for display/cache key.

    Raises:
        ValidationError: If format is unsupported or parsing fails
    """
    ext = Path(filename).suffix.lower()
    if ext == ".json":
        return _parse_json(file_content)
    if ext == ".graphml":
        return _parse_graphml(file_content)
    if ext == ".gexf":
        return _parse_gexf(file_content)
    raise ValidationError(
        f"Unsupported format: {ext}. Use .json, .graphml, or .gexf",
        details={"filename": filename},
    )


def _parse_json(content: bytes) -> tuple[nx.DiGraph, str]:
    """Parse our JSON export format."""
    try:
        data = json.loads(content.decode("utf-8"))
    except json.JSONDecodeError as e:
        raise ValidationError(f"Invalid JSON: {e}") from e

    # Our export format: { elements: { nodes: [...], edges: [...] }, metadata: { project_path } }
    elements = data.get("elements") or data.get("nodes")  # allow flat nodes/edges too
    if not elements:
        # Maybe raw AnalysisResult format
        if "nodes" in data and "edges" in data:
            return _graph_from_analysis_result(data)
        raise ValidationError("JSON must contain 'elements' (with nodes/edges) or 'nodes'/'edges'")

    nodes_data = elements.get("nodes", [])
    edges_data = elements.get("edges", [])
    if not nodes_data and not edges_data:
        raise ValidationError("JSON elements must contain nodes and/or edges")

    metadata = data.get("metadata", {})
    project_path = metadata.get("project_path", "imported")

    # Normalize: our export uses [{ data: { id, label, ... } }]
    def node_id(n: dict) -> str:
        d = n.get("data", n)
        return d.get("id", str(d.get("file_path", "")) or "unknown")

    def node_attrs(n: dict) -> dict:
        d = n.get("data", n)
        attrs = {
            "node_type": d.get("node_type", "module"),
            "file_path": d.get("file_path", node_id(n)),
        }
        if "external_kind" in d and d["external_kind"] in ("stdlib", "package"):
            attrs["external_kind"] = d["external_kind"]
        return attrs

    def edge_src(e: dict) -> str:
        d = e.get("data", e)
        return d.get("source", "")

    def edge_tgt(e: dict) -> str:
        d = e.get("data", e)
        return d.get("target", "")

    def edge_attrs(e: dict) -> dict:
        d = e.get("data", e)
        return {
            "import_type": d.get("import_type", "module"),
            "line_numbers": d.get("line_numbers", []),
        }

    g = nx.DiGraph()
    for n in nodes_data:
        nid = node_id(n)
        attrs = node_attrs(n)
        g.add_node(nid, **attrs)
    for e in edges_data:
        u, v = edge_src(e), edge_tgt(e)
        if u and v:
            g.add_edge(u, v, **edge_attrs(e))

    _ensure_node_edge_attrs(g)
    return g, project_path


def _graph_from_analysis_result(data: dict) -> tuple[nx.DiGraph, str]:
    """Build graph from raw AnalysisResult-like dict (nodes, edges, project_path)."""
    project_path = data.get("project_path", "imported")
    nodes_data = data.get("nodes", [])
    edges_data = data.get("edges", [])

    g = nx.DiGraph()
    for n in nodes_data:
        nid = n.get("id", "")
        if not nid:
            continue
        node_attrs = {
            "node_type": n.get("node_type", "module"),
            "file_path": n.get("file_path", nid),
        }
        if n.get("external_kind") in ("stdlib", "package"):
            node_attrs["external_kind"] = n["external_kind"]
        g.add_node(nid, **node_attrs)
    for e in edges_data:
        u, v = e.get("source"), e.get("target")
        if u and v:
            g.add_edge(
                u,
                v,
                import_type=e.get("import_type", "module"),
                line_numbers=e.get("line_numbers", []),
            )
    _ensure_node_edge_attrs(g)
    return g, project_path


def _parse_graphml(content: bytes) -> tuple[nx.DiGraph, str]:
    """Parse GraphML file."""
    try:
        g = nx.read_graphml(BytesIO(content))
    except Exception as e:
        raise ValidationError(f"GraphML parse error: {e}") from e
    if not isinstance(g, nx.DiGraph):
        g = nx.DiGraph(g)
    _ensure_node_edge_attrs(g)
    return g, "imported"


def _parse_gexf(content: bytes) -> tuple[nx.DiGraph, str]:
    """Parse GEXF file."""
    try:
        g = nx.read_gexf(BytesIO(content))
    except Exception as e:
        raise ValidationError(f"GEXF parse error: {e}") from e
    if not isinstance(g, nx.DiGraph):
        g = nx.DiGraph(g)
    _ensure_node_edge_attrs(g)
    return g, "imported"


def _ensure_node_edge_attrs(g: nx.DiGraph) -> None:
    """Ensure every node has node_type and file_path; every edge has import_type and line_numbers."""
    for n in g.nodes():
        if "node_type" not in g.nodes[n]:
            g.nodes[n]["node_type"] = "module"
        if "file_path" not in g.nodes[n]:
            g.nodes[n]["file_path"] = str(n)
    for u, v in g.edges():
        if "import_type" not in g[u][v]:
            g[u][v]["import_type"] = "module"
        if "line_numbers" not in g[u][v]:
            g[u][v]["line_numbers"] = []
