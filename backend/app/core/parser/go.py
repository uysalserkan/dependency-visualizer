"""Go parser using regex-based import extraction."""

import re
from pathlib import Path
from typing import List

from app.api.models import ImportInfo


class GoParser:
    """Parser for Go source files."""

    def get_supported_extensions(self) -> List[str]:
        """Get supported Go file extensions."""
        return [".go"]

    def parse_file(self, file_path: Path) -> List[ImportInfo]:
        """Parse a Go file and extract import statements.

        Go import syntax:
        - Single import: import "fmt"
        - Multiple imports: import ( "fmt" "net/http" )
        - Aliased import: import alias "package/path"
        - Dot import: import . "package/path"
        - Blank import: import _ "package/path"

        Args:
            file_path: Path to the Go file

        Returns:
            List of ImportInfo objects
        """
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            imports = []

            # Parse single-line imports
            imports.extend(self._parse_single_imports(content, str(file_path)))

            # Parse multi-line import blocks
            imports.extend(self._parse_import_blocks(content, str(file_path)))

            return imports

        except Exception as e:
            # Return empty list on error (encoding issues, etc.)
            return []

    def _parse_single_imports(self, content: str, file_path: str) -> List[ImportInfo]:
        """Parse single-line import statements.

        Examples:
        - import "fmt"
        - import alias "github.com/user/repo/pkg"
        - import _ "github.com/lib/pq"
        """
        imports = []

        # Pattern: import [alias] "package/path"
        # Matches: import "fmt", import f "fmt", import _ "fmt", import . "fmt"
        pattern = r'^import\s+(?:(?:\w+|_|\.)\s+)?"([^"]+)"'

        for i, line in enumerate(content.split("\n"), 1):
            # Skip comments
            stripped = line.strip()
            if stripped.startswith("//") or stripped.startswith("/*"):
                continue

            match = re.match(pattern, stripped)
            if match:
                package_path = match.group(1)
                imports.append(
                    ImportInfo(
                        source_file=file_path,
                        imported_module=package_path,
                        import_type="module",
                        line_number=i,
                    )
                )

        return imports

    def _parse_import_blocks(self, content: str, file_path: str) -> List[ImportInfo]:
        """Parse multi-line import blocks.

        Example:
        import (
            "fmt"
            "net/http"
            alias "github.com/user/repo/pkg"
            _ "github.com/lib/pq"
        )
        """
        imports = []

        # Find all import blocks: import ( ... )
        block_pattern = r'import\s*\(([\s\S]*?)\)'
        blocks = re.finditer(block_pattern, content)

        for block_match in blocks:
            block_content = block_match.group(1)
            
            # Find line number of the block start
            block_start = content[:block_match.start()].count('\n') + 1

            # Parse each import line within the block
            # Pattern: [alias] "package/path"
            import_pattern = r'^\s*(?:(?:\w+|_|\.)\s+)?"([^"]+)"'
            
            for j, line in enumerate(block_content.split('\n')):
                # Skip comments and empty lines
                stripped = line.strip()
                if not stripped or stripped.startswith('//') or stripped.startswith('/*'):
                    continue

                match = re.match(import_pattern, line)
                if match:
                    package_path = match.group(1)
                    line_number = block_start + j + 1
                    imports.append(
                        ImportInfo(
                            source_file=file_path,
                            imported_module=package_path,
                            import_type="module",
                            line_number=line_number,
                        )
                    )

        return imports
