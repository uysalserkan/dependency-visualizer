"""File discovery module for finding source files in a project."""

import fnmatch
from pathlib import Path

from app.core.parser.factory import ParserRegistry


class FileDiscovery:
    """Discover source files in a project directory."""

    def __init__(self, ignore_patterns: list[str] | None = None):
        """Initialize file discovery.

        Args:
            ignore_patterns: List of glob patterns to ignore
        """
        self.ignore_patterns = ignore_patterns or [
            ".venv",
            "venv",
            "__pycache__",
            ".git",
            "node_modules",
            "*.pyc",
            ".pytest_cache",
            ".ruff_cache",
        ]

    def _should_ignore(self, path: Path) -> bool:
        """Check if a path should be ignored.

        Args:
            path: Path to check

        Returns:
            True if path should be ignored
        """
        path_str = str(path)

        for pattern in self.ignore_patterns:
            # Check if any part of the path matches the pattern
            if fnmatch.fnmatch(path.name, pattern):
                return True
            # Check if pattern matches any parent directory
            for parent in path.parents:
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

        supported_extensions = ParserRegistry.get_supported_extensions()
        discovered_files = []

        # Recursively find all files with supported extensions
        for ext in supported_extensions:
            for file_path in project_path.rglob(f"*{ext}"):
                if file_path.is_file() and not self._should_ignore(file_path):
                    discovered_files.append(file_path)

        return sorted(discovered_files)
