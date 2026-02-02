"""Tests for JavaScript/TypeScript import resolution."""

import json
import tempfile
from pathlib import Path

import pytest

from app.core.graph.resolvers.javascript import JavaScriptImportResolver


@pytest.fixture
def temp_js_project():
    """Create a temporary JavaScript project structure for testing."""
    with tempfile.TemporaryDirectory() as tmpdir:
        project_root = Path(tmpdir)

        # Create project structure:
        # project/
        #   src/
        #     components/
        #       Button.tsx
        #       index.ts
        #     utils/
        #       helper.js
        #       index.js
        #     main.ts
        #   lib/
        #     config.js
        #   tsconfig.json

        (project_root / "src" / "components").mkdir(parents=True)
        (project_root / "src" / "utils").mkdir(parents=True)
        (project_root / "lib").mkdir(parents=True)

        # Create files
        (project_root / "src" / "components" / "Button.tsx").touch()
        (project_root / "src" / "components" / "index.ts").touch()
        (project_root / "src" / "utils" / "helper.js").touch()
        (project_root / "src" / "utils" / "index.js").touch()
        (project_root / "src" / "main.ts").touch()
        (project_root / "lib" / "config.js").touch()

        # Create tsconfig.json with path aliases
        tsconfig = {
            "compilerOptions": {
                "baseUrl": ".",
                "paths": {
                    "@/*": ["src/*"],
                    "~/lib/*": ["lib/*"],
                },
            }
        }
        (project_root / "tsconfig.json").write_text(json.dumps(tsconfig))

        yield project_root


def test_resolve_relative_import_same_dir(temp_js_project):
    """Test resolving relative import in same directory."""
    resolver = JavaScriptImportResolver(temp_js_project)
    source = str(temp_js_project / "src" / "components" / "Button.tsx")

    # ./index → index.ts
    result = resolver.resolve_import(source, "./index")
    expected = str((temp_js_project / "src" / "components" / "index.ts").resolve())
    assert result == expected


def test_resolve_relative_import_parent_dir(temp_js_project):
    """Test resolving relative import from parent directory."""
    resolver = JavaScriptImportResolver(temp_js_project)
    source = str(temp_js_project / "src" / "components" / "Button.tsx")

    # ../utils/helper → ../utils/helper.js
    result = resolver.resolve_import(source, "../utils/helper")
    expected = str((temp_js_project / "src" / "utils" / "helper.js").resolve())
    assert result == expected


def test_resolve_relative_import_with_extension(temp_js_project):
    """Test resolving relative import that already has extension."""
    resolver = JavaScriptImportResolver(temp_js_project)
    source = str(temp_js_project / "src" / "main.ts")

    # ./utils/helper.js (explicit extension)
    result = resolver.resolve_import(source, "./utils/helper.js")
    expected = str((temp_js_project / "src" / "utils" / "helper.js").resolve())
    assert result == expected


def test_resolve_index_file(temp_js_project):
    """Test resolving import to index file (package entry point)."""
    resolver = JavaScriptImportResolver(temp_js_project)
    source = str(temp_js_project / "src" / "main.ts")

    # ./utils → ./utils/index.js
    result = resolver.resolve_import(source, "./utils")
    expected = str((temp_js_project / "src" / "utils" / "index.js").resolve())
    assert result == expected


def test_resolve_path_alias(temp_js_project):
    """Test resolving path alias from tsconfig.json."""
    resolver = JavaScriptImportResolver(temp_js_project)
    source = str(temp_js_project / "src" / "main.ts")

    # @/components/Button → src/components/Button.tsx
    result = resolver.resolve_import(source, "@/components/Button")
    expected = str((temp_js_project / "src" / "components" / "Button.tsx").resolve())
    assert result == expected

    # ~/lib/config → lib/config.js
    result = resolver.resolve_import(source, "~/lib/config")
    expected = str((temp_js_project / "lib" / "config.js").resolve())
    assert result == expected


def test_resolve_external_package(temp_js_project):
    """Test that external packages (node_modules) return None."""
    resolver = JavaScriptImportResolver(temp_js_project)
    source = str(temp_js_project / "src" / "main.ts")

    # External packages should return None
    assert resolver.resolve_import(source, "react") is None
    assert resolver.resolve_import(source, "lodash") is None
    assert resolver.resolve_import(source, "@mui/material") is None


def test_resolve_absolute_import_from_root(temp_js_project):
    """Test resolving absolute import from project root."""
    resolver = JavaScriptImportResolver(temp_js_project)
    source = str(temp_js_project / "lib" / "config.js")

    # src/utils/helper → {project_root}/src/utils/helper.js
    result = resolver.resolve_import(source, "src/utils/helper")
    expected = str((temp_js_project / "src" / "utils" / "helper.js").resolve())
    assert result == expected


def test_resolve_nonexistent_file(temp_js_project):
    """Test that nonexistent files return None."""
    resolver = JavaScriptImportResolver(temp_js_project)
    source = str(temp_js_project / "src" / "main.ts")

    # File doesn't exist
    assert resolver.resolve_import(source, "./nonexistent") is None
    assert resolver.resolve_import(source, "@/nonexistent/file") is None


def test_supported_extensions():
    """Test that resolver supports correct file extensions."""
    resolver = JavaScriptImportResolver(Path("."))
    extensions = resolver.get_supported_extensions()

    assert ".js" in extensions
    assert ".jsx" in extensions
    assert ".ts" in extensions
    assert ".tsx" in extensions
    assert ".mjs" in extensions
    assert ".cjs" in extensions


def test_load_path_aliases_jsconfig(temp_js_project):
    """Test loading path aliases from jsconfig.json."""
    # Remove tsconfig, create jsconfig
    (temp_js_project / "tsconfig.json").unlink()

    jsconfig = {
        "compilerOptions": {
            "baseUrl": "./src",
            "paths": {
                "@components/*": ["components/*"],
            },
        }
    }
    (temp_js_project / "jsconfig.json").write_text(json.dumps(jsconfig))

    resolver = JavaScriptImportResolver(temp_js_project)
    source = str(temp_js_project / "src" / "main.ts")

    # @components/Button → src/components/Button.tsx
    result = resolver.resolve_import(source, "@components/Button")
    expected = str((temp_js_project / "src" / "components" / "Button.tsx").resolve())
    assert result == expected


def test_resolve_multiple_extension_priority(temp_js_project):
    """Test that resolver tries extensions in order and picks first match."""
    # Create both .js and .ts versions
    (temp_js_project / "src" / "ambiguous.js").touch()
    (temp_js_project / "src" / "ambiguous.ts").touch()

    resolver = JavaScriptImportResolver(temp_js_project)
    source = str(temp_js_project / "src" / "main.ts")

    # Should resolve to first matching extension
    result = resolver.resolve_import(source, "./ambiguous")
    assert result is not None
    assert Path(result).suffix in [".js", ".ts"]
