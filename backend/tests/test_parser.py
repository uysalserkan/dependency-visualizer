"""Tests for Python parser."""

import tempfile
from pathlib import Path

import pytest

from app.core.parser.python import PythonParser


@pytest.fixture
def temp_dir():
    """Create a temporary directory for test files."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


@pytest.fixture
def parser():
    """Create a Python parser instance."""
    return PythonParser()


def test_parser_supported_extensions(parser):
    """Test that parser supports .py and .pyi files."""
    extensions = parser.get_supported_extensions()
    assert ".py" in extensions
    assert ".pyi" in extensions


def test_parse_simple_import(parser, temp_dir):
    """Test parsing simple import statements."""
    test_file = temp_dir / "test.py"
    test_file.write_text("import os\nimport sys\n")

    imports = parser.parse_file(test_file)

    assert len(imports) == 2
    assert imports[0].imported_module == "os"
    assert imports[0].import_type == "module"
    assert imports[1].imported_module == "sys"


def test_parse_from_import(parser, temp_dir):
    """Test parsing from...import statements."""
    test_file = temp_dir / "test.py"
    test_file.write_text("from pathlib import Path\nfrom os import path\n")

    imports = parser.parse_file(test_file)

    assert len(imports) == 2
    assert imports[0].imported_module == "pathlib"
    assert imports[0].import_type == "from"
    assert imports[1].imported_module == "os"


def test_parse_relative_imports(parser, temp_dir):
    """Test parsing relative import statements."""
    test_file = temp_dir / "test.py"
    test_file.write_text("from . import module\nfrom ..parent import something\n")

    imports = parser.parse_file(test_file)

    assert len(imports) == 2
    assert imports[0].imported_module == "."
    assert imports[1].imported_module == "..parent"


def test_parse_multiline_imports(parser, temp_dir):
    """Test parsing multiline import statements."""
    test_file = temp_dir / "test.py"
    test_file.write_text(
        """from typing import (
    List,
    Dict,
    Optional
)
"""
    )

    imports = parser.parse_file(test_file)

    assert len(imports) == 1
    assert imports[0].imported_module == "typing"


def test_parse_syntax_error(parser, temp_dir):
    """Test that syntax errors return empty list."""
    test_file = temp_dir / "test.py"
    test_file.write_text("import os\nthis is invalid syntax\n")

    imports = parser.parse_file(test_file)

    assert imports == []


def test_parse_empty_file(parser, temp_dir):
    """Test parsing empty file."""
    test_file = temp_dir / "test.py"
    test_file.write_text("")

    imports = parser.parse_file(test_file)

    assert imports == []


def test_parse_no_imports(parser, temp_dir):
    """Test file with no imports."""
    test_file = temp_dir / "test.py"
    test_file.write_text("def hello():\n    return 'world'\n")

    imports = parser.parse_file(test_file)

    assert imports == []


def test_line_numbers(parser, temp_dir):
    """Test that line numbers are correct."""
    test_file = temp_dir / "test.py"
    test_file.write_text("# comment\nimport os\n\nimport sys\n")

    imports = parser.parse_file(test_file)

    assert imports[0].line_number == 2
    assert imports[1].line_number == 4
