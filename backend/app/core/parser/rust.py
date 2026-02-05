import re
from pathlib import Path
from typing import List

from app.api.models import ImportInfo


class RustParser:
    """Parser for Rust files."""

    def get_supported_extensions(self) -> List[str]:
        """Get supported file extensions."""
        return [".rs"]

    def parse_file(self, file_path: Path) -> List[ImportInfo]:
        """Parse a Rust file and extract mod/use statements.

        Args:
            file_path: Path to the file

        Returns:
            List of ImportInfo objects
        """
        imports = []
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            patterns = [
                (r"mod\s+([a-zA-Z0-9_]+)\s*;", "mod"),
                (r"use\s+([a-zA-Z0-9_:]+)", "use"),
                (r"extern\s+crate\s+([a-zA-Z0-9_]+)\s*;", "extern_crate"),
            ]

            for i, line in enumerate(content.split("\n"), 1):
                line = line.strip()
                if line.startswith("//"):
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
