import re
from pathlib import Path
from typing import List

from app.api.models import ImportInfo


class RubyParser:
    """Parser for Ruby files."""

    def get_supported_extensions(self) -> List[str]:
        """Get supported file extensions."""
        return [".rb"]

    def parse_file(self, file_path: Path) -> List[ImportInfo]:
        """Parse a Ruby file and extract require statements.

        Args:
            file_path: Path to the file

        Returns:
            List of ImportInfo objects
        """
        imports = []
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            # Handle optional parentheses: require("foo") or require "foo"
            patterns = [
                (r"""require\s*\(?\s*['"]([^'"]+)['"]""", "require"),
                (r"""require_relative\s*\(?\s*['"]([^'"]+)['"]""", "require_relative"),
                (r"""load\s*\(?\s*['"]([^'"]+)['"]""", "load"),
            ]

            for i, line in enumerate(content.split("\n"), 1):
                line = line.strip()
                if line.startswith("#"):
                    continue

                for pattern, import_type in patterns:
                    matches = re.finditer(pattern, line)
                    for match in matches:
                        imports.append(
                            ImportInfo(
                                source_file=str(file_path),
                                imported_module=match.group(1),
                                import_type=import_type,
                                line_number=i,
                            )
                        )
        except Exception:
            pass
        return imports
