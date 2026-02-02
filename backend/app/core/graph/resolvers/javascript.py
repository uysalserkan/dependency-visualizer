"""JavaScript/TypeScript import resolver."""

import json
from pathlib import Path

from app.core.graph.resolvers.base import ImportResolver
from app.core.logging import get_logger

logger = get_logger(__name__)


class JavaScriptImportResolver(ImportResolver):
    """Resolve JavaScript/TypeScript imports (ES6, CommonJS, relative, absolute)."""

    def __init__(self, project_root: Path):
        """Initialize JavaScript resolver.

        Args:
            project_root: Root directory of the project
        """
        super().__init__(project_root)
        self._path_aliases = self._load_path_aliases()

    def get_supported_extensions(self) -> list[str]:
        """Get supported JS/TS file extensions."""
        return [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]

    def resolve_import(self, source_file: str, import_module: str) -> str | None:
        """Resolve a JavaScript/TypeScript import to a file path.

        Handles:
        - Relative imports: ./utils, ../components/Button
        - Absolute imports: src/utils, components/Button
        - Path aliases: @/components, ~/utils
        - Extensions: .js, .jsx, .ts, .tsx, .mjs, .cjs
        - Index files: index.js, index.ts (package entry points)

        Args:
            source_file: Absolute path to JS/TS file containing import
            import_module: Raw imported path (e.g. "./utils", "@/components/Button")

        Returns:
            Absolute path to resolved file, or None if external (node_modules)
        """
        # External package (no relative path, no alias)
        if not import_module.startswith(".") and not import_module.startswith("/"):
            # Check if it's a path alias
            if self._is_path_alias(import_module):
                return self._resolve_alias_import(import_module)
            # Try as absolute path within project
            resolved = self._resolve_absolute_import(import_module)
            if resolved:
                return resolved
            # Otherwise, it's an external package (node_modules)
            return None

        # Relative import (starts with ./ or ../)
        if import_module.startswith("."):
            return self._resolve_relative_import(source_file, import_module)

        # Absolute path from root (starts with /)
        if import_module.startswith("/"):
            return self._resolve_from_root(import_module)

        return None

    def _resolve_relative_import(self, source_file: str, import_module: str) -> str | None:
        """Resolve relative import (./, ../).

        Examples:
        - ./utils → ./utils.js, ./utils.ts, ./utils/index.js
        - ../components/Button → ../components/Button.tsx, ../components/Button.js
        """
        source_path = Path(source_file).resolve().parent
        target_path = (source_path / import_module).resolve()

        return self._try_resolve_js_path(target_path)

    def _resolve_absolute_import(self, import_module: str) -> str | None:
        """Resolve absolute import from project root.

        Examples:
        - src/utils → {project_root}/src/utils.ts
        - components/Button → {project_root}/components/Button.jsx
        """
        target_path = (self.project_root / import_module).resolve()
        return self._try_resolve_js_path(target_path)

    def _resolve_from_root(self, import_module: str) -> str | None:
        """Resolve import starting with / (absolute from project root)."""
        import_module = import_module.lstrip("/")
        target_path = (self.project_root / import_module).resolve()
        return self._try_resolve_js_path(target_path)

    def _resolve_alias_import(self, import_module: str) -> str | None:
        """Resolve path alias import (@/, ~/).

        Examples:
        - @/components/Button → src/components/Button.tsx (if @ → src)
        - ~/utils → utils.js (if ~ → .)
        """
        for alias, alias_path in self._path_aliases.items():
            if import_module.startswith(alias):
                # Replace alias with actual path
                relative_path = import_module[len(alias):].lstrip("/")
                target_path = (self.project_root / alias_path / relative_path).resolve()
                return self._try_resolve_js_path(target_path)

        return None

    def _try_resolve_js_path(self, target_path: Path) -> str | None:
        """Try to resolve a path to an actual JS/TS file.

        Resolution order:
        1. Exact path if it has supported extension
        2. Path + supported extensions (.js, .jsx, .ts, .tsx, .mjs, .cjs)
        3. Path/index + supported extensions (package entry point)

        Args:
            target_path: Path to resolve

        Returns:
            Absolute path to file, or None if not found in project
        """
        # If path already has a supported extension, check directly
        if target_path.suffix in self.get_supported_extensions():
            if target_path.exists() and self._is_in_project(target_path):
                return str(target_path.resolve())

        # Try adding each supported extension
        for ext in self.get_supported_extensions():
            file_with_ext = target_path.with_suffix(ext)
            if file_with_ext.exists() and self._is_in_project(file_with_ext):
                return str(file_with_ext.resolve())

        # Try as directory with index file
        if target_path.is_dir():
            for ext in self.get_supported_extensions():
                index_file = target_path / f"index{ext}"
                if index_file.exists() and self._is_in_project(index_file):
                    return str(index_file.resolve())

        return None

    def _is_path_alias(self, import_module: str) -> bool:
        """Check if import uses a path alias."""
        for alias in self._path_aliases:
            if import_module.startswith(alias):
                return True
        return False

    def _load_path_aliases(self) -> dict[str, str]:
        """Load path aliases from tsconfig.json or jsconfig.json.

        Examples from tsconfig/jsconfig:
        {
          "compilerOptions": {
            "baseUrl": ".",
            "paths": {
              "@/*": ["src/*"],
              "~/*": ["./*"]
            }
          }
        }

        Returns:
            Dict mapping alias prefix to actual path (e.g. {"@/": "src", "~/": "."})
        """
        aliases = {}

        # Try tsconfig.json first, then jsconfig.json
        for config_file in ["tsconfig.json", "jsconfig.json"]:
            config_path = self.project_root / config_file
            if config_path.exists():
                try:
                    with open(config_path, "r", encoding="utf-8") as f:
                        config = json.load(f)

                    compiler_options = config.get("compilerOptions", {})
                    base_url = compiler_options.get("baseUrl", ".")
                    paths = compiler_options.get("paths", {})

                    for alias_pattern, target_patterns in paths.items():
                        # Convert "@/*" → "@/"
                        alias = alias_pattern.rstrip("*")
                        if target_patterns and isinstance(target_patterns, list):
                            # Convert ["src/*"] → "src"
                            target = target_patterns[0].rstrip("/*")
                            # Combine with baseUrl
                            full_path = str(Path(base_url) / target)
                            aliases[alias] = full_path

                    logger.debug(
                        "Loaded path aliases",
                        config_file=config_file,
                        aliases=aliases,
                    )
                    break  # Use first found config
                except Exception as e:
                    logger.warning(
                        "Failed to load path aliases",
                        config_file=config_file,
                        error=str(e),
                    )

        return aliases
