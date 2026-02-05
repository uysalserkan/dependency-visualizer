from pathlib import Path

from app.core.graph.resolvers.base import ImportResolver


class CppImportResolver(ImportResolver):
    """Resolver for C and C++ imports."""

    def get_supported_extensions(self) -> list[str]:
        """Get supported file extensions."""
        return [".c", ".h", ".cpp", ".hpp", ".cc", ".hh", ".cxx"]

    def resolve_import(self, source_file: str, import_module: str) -> str | None:
        """Resolve a C/C++ include to a file path.

        Args:
            source_file: Absolute path to file containing the import
            import_module: Raw imported module path

        Returns:
            Absolute path to resolved file, or None
        """
        source_path = Path(source_file)
        
        # Try relative to source file
        candidate = source_path.parent / import_module
        if candidate.exists() and candidate.is_file():
            return str(candidate.resolve())
            
        # Try relative to project root (include path)
        candidate = self.project_root / import_module
        if candidate.exists() and candidate.is_file():
            return str(candidate.resolve())
            
        # Common include dirs
        for d in ["include", "inc", "src"]:
            candidate = self.project_root / d / import_module
            if candidate.exists() and candidate.is_file():
                return str(candidate.resolve())

        return None
