from pathlib import Path

from app.core.graph.resolvers.base import ImportResolver


class RustImportResolver(ImportResolver):
    """Resolver for Rust imports."""

    def get_supported_extensions(self) -> list[str]:
        """Get supported file extensions."""
        return [".rs"]

    def resolve_import(self, source_file: str, import_module: str) -> str | None:
        """Resolve a Rust import to a file path.

        Args:
            source_file: Absolute path to file containing the import
            import_module: Raw imported module path

        Returns:
            Absolute path to resolved file, or None
        """
        source_path = Path(source_file)
        
        # 1. Handle 'mod name' -> name.rs or name/mod.rs
        # Only if import_module is a simple name (no ::)
        if "::" not in import_module:
            # Check name.rs sibling
            candidate = source_path.parent / f"{import_module}.rs"
            if candidate.exists() and candidate.is_file():
                return str(candidate.resolve())
                
            # Check name/mod.rs sibling
            candidate = source_path.parent / import_module / "mod.rs"
            if candidate.exists() and candidate.is_file():
                return str(candidate.resolve())

        # 2. Handle 'use crate::...'
        if import_module.startswith("crate::"):
            # Assume crate root is src/
            # This is a simplification. Real crate root detection requires Cargo.toml analysis.
            path_parts = import_module.split("::")[1:] # remove 'crate'
            if not path_parts:
                return None
                
            relative_path = Path(*path_parts)
            
            # Try finding it under src/
            src_root = self.project_root / "src"
            if src_root.exists():
                 candidate = src_root.joinpath(relative_path).with_suffix(".rs")
                 if candidate.exists():
                     return str(candidate.resolve())
                 
                 # Try as folder/mod.rs
                 candidate = src_root.joinpath(relative_path) / "mod.rs"
                 if candidate.exists():
                     return str(candidate.resolve())
                     
        return None
