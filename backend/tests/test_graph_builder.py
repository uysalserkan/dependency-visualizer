"""Tests for graph builder canonical node ID (merge x, .x, from x import)."""

import tempfile
from pathlib import Path

import pytest

from app.api.models import ImportInfo
from app.core.graph.builder import GraphBuilder


@pytest.fixture
def project_with_module(tmp_path):
    """Create a project with a module 'mymod' that can be imported as mymod, .mymod, from mymod."""
    (tmp_path / "mymod.py").write_text("# mymod\n")
    (tmp_path / "caller.py").write_text("import mymod\nfrom mymod import x\n")
    (tmp_path / "pkg").mkdir(exist_ok=True)
    (tmp_path / "pkg" / "__init__.py").write_text("# pkg\n")
    (tmp_path / "pkg" / "caller.py").write_text("import mymod\nfrom ..mymod import x\n")
    return tmp_path


def test_canonical_node_id_internal_module(project_with_module):
    """import mymod, from mymod import x, and from ..mymod (in pkg) should resolve to same node."""
    root = project_with_module
    builder = GraphBuilder(root)

    # Simulate imports: caller.py -> mymod (absolute), caller.py -> mymod (from)
    imports = [
        ImportInfo(source_file=str(root / "caller.py"), imported_module="mymod", import_type="module", line_number=1),
        ImportInfo(source_file=str(root / "caller.py"), imported_module="mymod", import_type="from", line_number=2),
    ]
    builder.add_imports(imports)

    nodes = list(builder.graph.nodes())
    # Source: caller.py. Target: should be single node (resolved path to mymod.py)
    assert len(nodes) == 2  # caller.py + mymod (one target)
    assert str(root / "caller.py") in nodes
    # Target must be the resolved path, not "mymod"
    mymod_canonical = str((root / "mymod.py").resolve())
    assert mymod_canonical in nodes

    edges = list(builder.graph.edges())
    assert len(edges) == 1  # single edge caller -> mymod.py (merged)
    assert edges[0][1] == mymod_canonical


def test_canonical_node_id_relative_and_absolute(project_with_module):
    """Absolute 'mymod' and relative '..mymod' from pkg/caller.py should be one node."""
    root = project_with_module
    builder = GraphBuilder(root)

    pkg_caller = str((root / "pkg" / "caller.py").resolve())
    mymod_resolved = str((root / "mymod.py").resolve())

    imports = [
        ImportInfo(source_file=pkg_caller, imported_module="mymod", import_type="module", line_number=1),
        ImportInfo(source_file=pkg_caller, imported_module="..mymod", import_type="from", line_number=2),
    ]
    builder.add_imports(imports)

    nodes = list(builder.graph.nodes())
    assert len(nodes) == 2
    assert mymod_resolved in nodes
    assert pkg_caller in nodes

    edges = list(builder.graph.edges())
    assert len(edges) == 1
    assert edges[0] == (pkg_caller, mymod_resolved)


def test_external_module_unchanged():
    """External modules (e.g. 'os') stay as single node by name, not path."""
    with tempfile.TemporaryDirectory() as tmpdir:
        root = Path(tmpdir)
        (root / "app.py").write_text("import os\nfrom os import path\n")
        builder = GraphBuilder(root)

        imports = [
            ImportInfo(source_file=str(root / "app.py"), imported_module="os", import_type="module", line_number=1),
            ImportInfo(source_file=str(root / "app.py"), imported_module="os", import_type="from", line_number=2),
        ]
        builder.add_imports(imports)

        nodes = list(builder.graph.nodes())
        assert "os" in nodes
        assert len(nodes) == 2  # app.py + os
        edges = list(builder.graph.edges())
        assert len(edges) == 1
        assert edges[0][1] == "os"
