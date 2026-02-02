"""Base parser interface for language-specific parsers."""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Protocol

from app.api.models import ImportInfo


class LanguageParser(Protocol):
    """Protocol for language-specific parsers."""

    def parse_file(self, file_path: Path) -> list[ImportInfo]:
        """Parse a file and extract import information.

        Args:
            file_path: Path to the file to parse

        Returns:
            List of ImportInfo objects representing imports found in the file
        """
        ...

    def get_supported_extensions(self) -> list[str]:
        """Get list of file extensions this parser supports.

        Returns:
            List of file extensions (e.g., ['.py', '.pyi'])
        """
        ...
