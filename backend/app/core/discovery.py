"""File discovery module for finding source files in a project."""

import fnmatch
import os
from pathlib import Path

from app.core.parser.factory import ParserRegistry

# Default patterns always excluded from discovery (never scan these).
# Merged with request ignore_patterns so .venv / node_modules are never read.
DEFAULT_IGNORE_PATTERNS = [
    ".venv",
    "venv",
    ".dev",
    ".master",
    "env",
    ".env",
    "__pycache__",
    ".git",
    "node_modules",
    "*.pyc",
    ".pytest_cache",
    ".ruff_cache",
    ".mypy_cache",
    ".tox",
    ".nox",
    ".idea",
    ".vscode",
    "dist",
    "build",
    "*.egg-info",
    "*.egg",
    "*.dist-info",
    "site-packages",
    ".eggs",
    ".next",
    ".nuxt",
    "target",
    "vendor",
    ".cache",
    "htmlcov",
    ".coverage",
    ".hypothesis",
]


class FileDiscovery:
    """Discover source files in a project directory."""

    def __init__(self, ignore_patterns: list[str] | None = None):
        """Initialize file discovery.

        Args:
            ignore_patterns: Additional glob patterns to ignore. Always merged with
                DEFAULT_IGNORE_PATTERNS so .venv, node_modules, etc. are never scanned.
        """
        base = list(DEFAULT_IGNORE_PATTERNS)
        extra = ignore_patterns or []
        self.ignore_patterns = list(dict.fromkeys(base + extra))

    def _should_ignore(self, path: Path) -> bool:
        """Check if a path should be ignored.

        Uses resolved path so symlinks (e.g. .venv) are correctly matched.
        Any path segment matching an ignore pattern (or any parent directory name)
        causes the path to be ignored.

        Args:
            path: Path to check

        Returns:
            True if path should be ignored
        """
        try:
            resolved = path.resolve()
        except OSError:
            resolved = path

        for pattern in self.ignore_patterns:
            if fnmatch.fnmatch(resolved.name, pattern):
                return True
            for parent in resolved.parents:
                if fnmatch.fnmatch(parent.name, pattern):
                    return True

        return False

    def discover_files(self, project_path: Path) -> list[Path]:
        """Discover all supported source files in a project.

        Args:
            project_path: Root directory of the project

        Returns:
            List of file paths
        """
        if not project_path.exists():
            raise ValueError(f"Project path does not exist: {project_path}")

        if not project_path.is_dir():
            raise ValueError(f"Project path is not a directory: {project_path}")

        supported_extensions = frozenset(ParserRegistry.get_supported_extensions())
        discovered_files = []
        project_path = Path(project_path)
        root_str = str(project_path)

        # Single tree walk instead of one rglob per extension (much faster on large projects)
        for dirpath, dirnames, filenames in os.walk(root_str):
            # Prune ignored directories so we don't descend into .venv, node_modules, etc.
            dirnames[:] = [
                d for d in dirnames
                if not any(fnmatch.fnmatch(d, p) for p in self.ignore_patterns)
            ]
            for name in filenames:
                file_path = Path(dirpath) / name
                if file_path.suffix in supported_extensions and not self._should_ignore(file_path):
                    discovered_files.append(file_path)

        return sorted(discovered_files)
