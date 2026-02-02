"""Java parser using regex-based import extraction."""

import re
from pathlib import Path
from typing import List

from app.api.models import ImportInfo


class JavaParser:
    """Parser for Java source files."""

    def get_supported_extensions(self) -> List[str]:
        """Get supported Java file extensions."""
        return [".java"]

    def parse_file(self, file_path: Path) -> List[ImportInfo]:
        """Parse a Java file and extract import statements.

        Java import syntax:
        - Single import: import java.util.ArrayList;
        - On-demand import: import java.util.*;
        - Static import: import static java.lang.Math.PI;
        - Static on-demand: import static java.lang.Math.*;

        Args:
            file_path: Path to the Java file

        Returns:
            List of ImportInfo objects
        """
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            imports = []

            # Remove comments from content
            clean_content = self._remove_comments(content)

            # Parse imports from clean content
            imports.extend(self._parse_imports(clean_content, str(file_path)))

            return imports

        except Exception as e:
            # Return empty list on error (encoding issues, etc.)
            return []

    def _remove_comments(self, content: str) -> str:
        """Remove single-line and multi-line comments from Java source.

        Args:
            content: Java source code

        Returns:
            Content with comments removed (replaced with newlines to preserve line numbers)
        """
        result = []
        i = 0
        while i < len(content):
            # Check for single-line comment
            if i < len(content) - 1 and content[i : i + 2] == "//":
                # Skip until end of line
                while i < len(content) and content[i] != "\n":
                    i += 1
                if i < len(content):
                    result.append("\n")
                    i += 1
                continue

            # Check for multi-line comment
            if i < len(content) - 1 and content[i : i + 2] == "/*":
                # Skip until */
                result.append(" ")  # Replace comment with space
                i += 2
                while i < len(content) - 1:
                    if content[i : i + 2] == "*/":
                        i += 2
                        break
                    if content[i] == "\n":
                        result.append("\n")
                    else:
                        result.append(" ")
                    i += 1
                continue

            # Check for string literals (to avoid matching // or /* inside strings)
            if content[i] in ('"', "'"):
                quote = content[i]
                result.append(content[i])
                i += 1
                # Skip string content
                while i < len(content):
                    if content[i] == "\\":
                        # Escaped character
                        result.append(content[i])
                        i += 1
                        if i < len(content):
                            result.append(content[i])
                            i += 1
                    elif content[i] == quote:
                        result.append(content[i])
                        i += 1
                        break
                    else:
                        result.append(content[i])
                        i += 1
                continue

            result.append(content[i])
            i += 1

        return "".join(result)

    def _parse_imports(self, content: str, file_path: str) -> List[ImportInfo]:
        """Parse import statements from Java source.

        Args:
            content: Java source code (comments removed)
            file_path: Path to the Java file

        Returns:
            List of ImportInfo objects
        """
        imports = []

        # Pattern: import [static] package.Class [.subclass];
        # Matches: import java.util.ArrayList;
        #          import static java.lang.Math.PI;
        #          import java.util.*;
        pattern = r"^\s*import\s+(?:static\s+)?([a-zA-Z0-9_.]+(?:\.\*)?)\s*;"

        for i, line in enumerate(content.split("\n"), 1):
            # Skip empty lines
            stripped = line.strip()
            if not stripped:
                continue

            # Match import statement
            match = re.match(pattern, stripped)
            if match:
                imported_module = match.group(1)

                # Determine import type
                if "static" in stripped:
                    import_type = "from"
                else:
                    import_type = "module"

                imports.append(
                    ImportInfo(
                        source_file=file_path,
                        imported_module=imported_module,
                        import_type=import_type,
                        line_number=i,
                    )
                )

        return imports
