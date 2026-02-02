"""Base import resolver interface."""

from abc import ABC, abstractmethod
from pathlib import Path


class ImportResolver(ABC):
    """Abstract base class for language-specific import resolution."""

    def __init__(self, project_root: Path):
        """Initialize resolver with project root.

        Args:
            project_root: Root directory of the project
        """
        self.project_root = project_root.resolve()

    @abstractmethod
    def resolve_import(self, source_file: str, import_module: str) -> str | None:
        """Resolve an import statement to a file path.

        Args:
            source_file: Absolute path to file containing the import
            import_module: Raw imported module/path (e.g. "./utils", "lodash", "src/components")

        Returns:
            Absolute path to resolved file, or None if external/not found
        """
        pass

    @abstractmethod
    def get_supported_extensions(self) -> list[str]:
        """Get file extensions this resolver supports.

        Returns:
            List of extensions (e.g. [".py", ".pyi"])
        """
        pass

    def _is_in_project(self, file_path: Path) -> bool:
        """Check if a resolved path is within the project.

        Args:
            file_path: Path to check

        Returns:
            True if file is within project root
        """
        try:
            file_path.resolve().relative_to(self.project_root)
            return True
        except ValueError:
            return False
