"""Tests for Go parser and resolver."""

import tempfile
from pathlib import Path

import pytest

from app.core.parser.go import GoParser
from app.core.graph.resolvers.go import GoImportResolver


# --- Parser Tests ---

def test_go_parser_single_import():
    """Test parsing single import statement."""
    parser = GoParser()
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.go', delete=False) as f:
        f.write('''package main

import "fmt"

func main() {
    fmt.Println("Hello")
}
''')
        f.flush()
        
        imports = parser.parse_file(Path(f.name))
        
    assert len(imports) == 1
    assert imports[0].imported_module == "fmt"
    assert imports[0].line_number == 3


def test_go_parser_aliased_import():
    """Test parsing aliased import."""
    parser = GoParser()
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.go', delete=False) as f:
        f.write('''package main

import f "fmt"

func main() {
    f.Println("Hello")
}
''')
        f.flush()
        
        imports = parser.parse_file(Path(f.name))
        
    assert len(imports) == 1
    assert imports[0].imported_module == "fmt"


def test_go_parser_import_block():
    """Test parsing import block with multiple imports."""
    parser = GoParser()
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.go', delete=False) as f:
        f.write('''package main

import (
    "fmt"
    "net/http"
    "os"
)

func main() {}
''')
        f.flush()
        
        imports = parser.parse_file(Path(f.name))
        
    assert len(imports) == 3
    modules = {imp.imported_module for imp in imports}
    assert modules == {"fmt", "net/http", "os"}


def test_go_parser_import_block_with_aliases():
    """Test parsing import block with aliases and blank imports."""
    parser = GoParser()
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.go', delete=False) as f:
        f.write('''package main

import (
    "fmt"
    h "net/http"
    _ "github.com/lib/pq"
    . "encoding/json"
)

func main() {}
''')
        f.flush()
        
        imports = parser.parse_file(Path(f.name))
        
    assert len(imports) == 4
    modules = {imp.imported_module for imp in imports}
    assert modules == {"fmt", "net/http", "github.com/lib/pq", "encoding/json"}


def test_go_parser_ignores_comments():
    """Test that parser ignores commented imports."""
    parser = GoParser()
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.go', delete=False) as f:
        f.write('''package main

// import "fmt"
import "os"
/* import "net/http" */

func main() {}
''')
        f.flush()
        
        imports = parser.parse_file(Path(f.name))
        
    assert len(imports) == 1
    assert imports[0].imported_module == "os"


def test_go_parser_third_party_imports():
    """Test parsing third-party package imports."""
    parser = GoParser()
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.go', delete=False) as f:
        f.write('''package main

import (
    "fmt"
    "github.com/gorilla/mux"
    "golang.org/x/crypto/bcrypt"
)

func main() {}
''')
        f.flush()
        
        imports = parser.parse_file(Path(f.name))
        
    assert len(imports) == 3
    modules = {imp.imported_module for imp in imports}
    assert modules == {"fmt", "github.com/gorilla/mux", "golang.org/x/crypto/bcrypt"}


# --- Resolver Tests ---

@pytest.fixture
def temp_go_project():
    """Create a temporary Go project structure."""
    with tempfile.TemporaryDirectory() as tmpdir:
        project_root = Path(tmpdir)
        
        # Create go.mod
        (project_root / "go.mod").write_text("module github.com/user/myproject\n\ngo 1.21\n")
        
        # Create project structure
        (project_root / "internal").mkdir()
        (project_root / "internal" / "api").mkdir(parents=True)
        (project_root / "pkg").mkdir()
        (project_root / "pkg" / "utils").mkdir(parents=True)
        
        # Create Go files
        (project_root / "main.go").touch()
        (project_root / "internal" / "api" / "handler.go").touch()
        (project_root / "pkg" / "utils" / "helper.go").touch()
        
        yield project_root


def test_go_resolver_stdlib(temp_go_project):
    """Test that stdlib packages are detected as external."""
    resolver = GoImportResolver(temp_go_project)
    
    # Standard library packages should return None (external)
    assert resolver.resolve_import(str(temp_go_project / "main.go"), "fmt") is None
    assert resolver.resolve_import(str(temp_go_project / "main.go"), "net/http") is None
    assert resolver.resolve_import(str(temp_go_project / "main.go"), "encoding/json") is None


def test_go_resolver_third_party(temp_go_project):
    """Test that third-party packages are detected as external."""
    resolver = GoImportResolver(temp_go_project)
    
    # Third-party packages should return None (external)
    assert resolver.resolve_import(str(temp_go_project / "main.go"), "github.com/gorilla/mux") is None
    assert resolver.resolve_import(str(temp_go_project / "main.go"), "golang.org/x/tools") is None


def test_go_resolver_module_import(temp_go_project):
    """Test resolving module-based internal imports."""
    resolver = GoImportResolver(temp_go_project)
    
    # Module-based imports should resolve to internal paths
    result = resolver.resolve_import(
        str(temp_go_project / "main.go"),
        "github.com/user/myproject/internal/api"
    )
    expected = str((temp_go_project / "internal" / "api").resolve())
    assert result == expected
    
    result = resolver.resolve_import(
        str(temp_go_project / "main.go"),
        "github.com/user/myproject/pkg/utils"
    )
    expected = str((temp_go_project / "pkg" / "utils").resolve())
    assert result == expected


def test_go_resolver_relative_import(temp_go_project):
    """Test resolving relative imports."""
    resolver = GoImportResolver(temp_go_project)
    
    source_file = str(temp_go_project / "internal" / "api" / "handler.go")
    
    # Relative import should resolve
    result = resolver.resolve_import(source_file, "../api")
    expected = str((temp_go_project / "internal" / "api").resolve())
    assert result == expected


def test_go_resolver_nonexistent_package(temp_go_project):
    """Test that nonexistent packages return None."""
    resolver = GoImportResolver(temp_go_project)
    
    # Nonexistent internal package
    result = resolver.resolve_import(
        str(temp_go_project / "main.go"),
        "github.com/user/myproject/nonexistent"
    )
    assert result is None


def test_go_resolver_parse_module_path(temp_go_project):
    """Test parsing module path from go.mod."""
    resolver = GoImportResolver(temp_go_project)
    
    assert resolver._module_path == "github.com/user/myproject"


def test_go_resolver_no_go_mod():
    """Test resolver without go.mod file."""
    with tempfile.TemporaryDirectory() as tmpdir:
        project_root = Path(tmpdir)
        (project_root / "main.go").touch()
        
        resolver = GoImportResolver(project_root)
        
        # Without go.mod, module imports won't resolve
        assert resolver._module_path is None


def test_go_resolver_supported_extensions():
    """Test that resolver returns correct supported extensions."""
    resolver = GoImportResolver(Path("."))
    
    extensions = resolver.get_supported_extensions()
    assert extensions == [".go"]
