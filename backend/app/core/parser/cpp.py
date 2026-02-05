import re
from pathlib import Path
from typing import List

from app.api.models import ImportInfo


class CppParser:
    """Parser for C and C++ files."""

    def get_supported_extensions(self) -> List[str]:
        """Get supported file extensions."""
        return [".c", ".h", ".cpp", ".hpp", ".cc", ".hh", ".cxx"]

    def parse_file(self, file_path: Path) -> List[ImportInfo]:
        """Parse a C/C++ file and extract include statements.

        Args:
            file_path: Path to the file

        Returns:
            List of ImportInfo objects
        """
        imports = []
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            # Updated regex to handle:
            # - Spaces between # and include (# include)
            # - No space between include and " or < (#include<stdio.h>)
            patterns = [
                (r'#\s*include\s*"([^"]+)"', "local"),
                (r'#\s*include\s*<([^>]+)>', "system"),
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
        except Exception as e:
            print(f"CppParser error: {e}")
            pass
        return imports
