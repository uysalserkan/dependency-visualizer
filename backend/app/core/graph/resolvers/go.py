"""Go import resolver."""

from pathlib import Path

from app.core.graph.resolvers.base import ImportResolver
from app.core.logging import get_logger

logger = get_logger(__name__)


# Go standard library packages (common ones)
# Full list: https://pkg.go.dev/std
GO_STDLIB_PACKAGES = {
    # Core packages
    "fmt", "errors", "io", "os", "path", "time", "sync", "context",
    "strings", "bytes", "strconv", "math", "sort", "regexp", "encoding",
    
    # Network & HTTP
    "net", "net/http", "net/url", "net/rpc",
    
    # Data formats
    "encoding/json", "encoding/xml", "encoding/csv", "encoding/base64",
    "encoding/hex", "encoding/gob", "encoding/binary",
    
    # I/O & Files
    "io/ioutil", "io/fs", "os/exec", "os/signal", "os/user",
    "path/filepath", "bufio",
    
    # Crypto & Security
    "crypto", "crypto/md5", "crypto/sha1", "crypto/sha256", "crypto/sha512",
    "crypto/rand", "crypto/tls", "crypto/x509",
    
    # Testing & Debugging
    "testing", "testing/quick", "runtime", "runtime/debug", "log",
    
    # Reflection & Types
    "reflect", "unsafe",
    
    # Concurrency
    "sync/atomic",
    
    # Compression
    "compress/gzip", "compress/zlib", "archive/tar", "archive/zip",
    
    # Templates
    "text/template", "html/template",
    
    # Database
    "database/sql", "database/sql/driver",
    
    # Image
    "image", "image/color", "image/png", "image/jpeg", "image/gif",
    
    # Misc
    "flag", "container/list", "container/heap", "container/ring",
    "html", "mime", "plugin", "unicode",
}


class GoImportResolver(ImportResolver):
    """Resolve Go imports (stdlib, local packages, third-party)."""

    def __init__(self, project_root: Path):
        """Initialize Go resolver.

        Args:
            project_root: Root directory of the Go project
        """
        super().__init__(project_root)
        self._go_mod_path = self._find_go_mod()
        self._module_path = self._parse_module_path()

    def get_supported_extensions(self) -> list[str]:
        """Get supported Go file extensions."""
        return [".go"]

    def resolve_import(self, source_file: str, import_module: str) -> str | None:
        """Resolve a Go import to a file path.

        Go import resolution:
        1. Standard library packages -> external (None)
        2. Relative imports (./pkg, ../pkg) -> resolve from source file
        3. Module-based imports matching project module -> internal
        4. Third-party imports -> external (None)

        Args:
            source_file: Absolute path to Go file containing import
            import_module: Import path (e.g. "fmt", "github.com/user/repo/pkg")

        Returns:
            Absolute path to resolved package directory (for internal), or None (external)
        """
        # Standard library packages are external
        if self._is_stdlib(import_module):
            return None

        # Relative imports (./pkg or ../pkg)
        if import_module.startswith("./") or import_module.startswith("../"):
            return self._resolve_relative_import(source_file, import_module)

        # Module-based imports
        if self._module_path and import_module.startswith(self._module_path):
            return self._resolve_module_import(import_module)

        # Third-party imports (not in our module)
        return None

    def _is_stdlib(self, import_path: str) -> bool:
        """Check if import is from Go standard library.

        Args:
            import_path: Import path to check

        Returns:
            True if stdlib package
        """
        # Check exact match
        if import_path in GO_STDLIB_PACKAGES:
            return True

        # Check if it's a sub-package of stdlib (e.g. net/http/httputil)
        parts = import_path.split("/")
        for i in range(1, len(parts) + 1):
            potential_pkg = "/".join(parts[:i])
            if potential_pkg in GO_STDLIB_PACKAGES:
                return True

        # Stdlib packages don't have dots in first component (heuristic)
        # Third-party: github.com/user/repo, golang.org/x/tools
        # Stdlib: fmt, net/http, encoding/json
        first_component = parts[0]
        return "." not in first_component

    def is_stdlib(self, source_file: str, import_module: str) -> bool:
        """True if the import is Go standard library (not third-party)."""
        return self._is_stdlib(import_module)

    def _resolve_relative_import(self, source_file: str, import_path: str) -> str | None:
        """Resolve relative import (./pkg, ../pkg).

        Args:
            source_file: Source file path
            import_path: Relative import path

        Returns:
            Absolute path to package directory or None
        """
        source_dir = Path(source_file).parent
        target_dir = (source_dir / import_path).resolve()

        if target_dir.exists() and target_dir.is_dir() and self._is_in_project(target_dir):
            # Go packages are directories, not specific files
            # Return directory path if it contains .go files
            if list(target_dir.glob("*.go")):
                return str(target_dir)

        return None

    def _resolve_module_import(self, import_path: str) -> str | None:
        """Resolve module-based import within project.

        Example:
        - Module: github.com/user/myproject
        - Import: github.com/user/myproject/internal/api
        - Resolves to: {project_root}/internal/api

        Args:
            import_path: Full module import path

        Returns:
            Absolute path to package directory or None
        """
        if not self._module_path:
            return None

        # Remove module prefix to get relative path
        if not import_path.startswith(self._module_path):
            return None

        # Get path relative to module root
        relative_path = import_path[len(self._module_path):].lstrip("/")
        
        if not relative_path:
            # Import is the module itself
            return str(self.project_root)

        target_dir = self.project_root / relative_path

        if target_dir.exists() and target_dir.is_dir() and self._is_in_project(target_dir):
            # Check if directory contains Go files
            if list(target_dir.glob("*.go")):
                return str(target_dir)

        return None

    def _find_go_mod(self) -> Path | None:
        """Find go.mod file in project root.

        Returns:
            Path to go.mod or None
        """
        go_mod = self.project_root / "go.mod"
        if go_mod.exists():
            return go_mod
        return None

    def _parse_module_path(self) -> str | None:
        """Parse module path from go.mod.

        Returns:
            Module path (e.g. "github.com/user/myproject") or None
        """
        if not self._go_mod_path:
            return None

        try:
            with open(self._go_mod_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("module "):
                        # module github.com/user/myproject
                        return line.split(maxsplit=1)[1].strip()
        except Exception as e:
            logger.warning(
                "Failed to parse go.mod",
                go_mod=str(self._go_mod_path),
                error=str(e),
            )

        return None
