"""Python AST parser for extracting import statements."""

import ast
from pathlib import Path

from app.api.models import ImportInfo


class PythonParser:
    """Parser for Python files using the AST module."""

    def get_supported_extensions(self) -> list[str]:
        """Get supported file extensions."""
        return [".py", ".pyi"]

    def parse_file(self, file_path: Path) -> list[ImportInfo]:
        """Parse a Python file and extract all import statements.

        Args:
            file_path: Path to the Python file

        Returns:
            List of ImportInfo objects
        """
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            tree = ast.parse(content, filename=str(file_path))
            imports = []

            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    # Handle: import module, import module as alias
                    for alias in node.names:
                        imports.append(
                            ImportInfo(
                                source_file=str(file_path),
                                imported_module=alias.name,
                                import_type="module",
                                line_number=node.lineno,
                            )
                        )

                elif isinstance(node, ast.ImportFrom):
                    # Handle: from module import name
                    if node.module:  # module can be None for relative imports like "from . import x"
                        module_name = node.module
                        # Handle relative imports
                        if node.level > 0:
                            module_name = "." * node.level + (node.module or "")

                        imports.append(
                            ImportInfo(
                                source_file=str(file_path),
                                imported_module=module_name,
                                import_type="from",
                                line_number=node.lineno,
                            )
                        )

            return imports

        except SyntaxError as e:
            # Return empty list for files with syntax errors
            # These will be reported as warnings
            return []
        except Exception as e:
            # Catch other errors (encoding issues, etc.)
            return []
