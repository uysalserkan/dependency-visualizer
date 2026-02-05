from pathlib import Path

from app.core.graph.resolvers.base import ImportResolver


class RubyImportResolver(ImportResolver):
    """Resolver for Ruby imports."""

    def get_supported_extensions(self) -> list[str]:
        """Get supported file extensions."""
        return [".rb"]

    def resolve_import(self, source_file: str, import_module: str) -> str | None:
        """Resolve a Ruby import to a file path.

        Args:
            source_file: Absolute path to file containing the import
            import_module: Raw imported module path

        Returns:
            Absolute path to resolved file, or None
        """
        source_path = Path(source_file)
        
        # Check if it's a relative path starting with ./ or ../
        is_explicit_relative = import_module.startswith("./") or import_module.startswith("../")
        
        search_paths = []
        
        # If explicitly relative, only look relative to source
        if is_explicit_relative:
            search_paths.append(source_path.parent / import_module)
        else:
            # Otherwise, check relative to source and project root (simplified load path)
            search_paths.append(source_path.parent / import_module)
            search_paths.append(self.project_root / import_module)
            # Check lib folder which is common in Ruby
            search_paths.append(self.project_root / "lib" / import_module)

        for path in search_paths:
            # Try with and without extension
            candidates = [path]
            if not path.suffix:
                candidates.append(path.with_suffix(".rb"))
            
            for candidate in candidates:
                if candidate.exists() and candidate.is_file():
                    return str(candidate.resolve())
        
        return None
