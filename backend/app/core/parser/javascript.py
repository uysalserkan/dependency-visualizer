"""JavaScript/TypeScript parser using AST."""

import json
import re
import subprocess
from pathlib import Path
from typing import List

from app.api.models import ImportInfo
from app.config import settings


# Path to the acorn-based JS parser script
JS_AST_PARSER_PATH = Path(__file__).parent.parent.parent.parent / "scripts" / "js_ast_parser.js"


class JavaScriptParser:
    """Parser for JavaScript and TypeScript files."""

    def __init__(self):
        """Initialize JavaScript parser."""
        self._node_available = self._check_node()
        self._ast_parser_available = self._node_available and JS_AST_PARSER_PATH.exists()

    def _check_node(self) -> bool:
        """Check if Node.js is available for AST parsing."""
        try:
            result = subprocess.run(
                ["node", "--version"], capture_output=True, text=True, timeout=2
            )
            return result.returncode == 0
        except Exception:
            return False

    def get_supported_extensions(self) -> List[str]:
        """Get supported file extensions."""
        return [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]

    def parse_file(self, file_path: Path) -> List[ImportInfo]:
        """Parse a JavaScript/TypeScript file and extract import statements.

        Args:
            file_path: Path to the file

        Returns:
            List of ImportInfo objects
        """
        # Determine parser mode
        mode = settings.JS_PARSER_MODE
        
        if mode == "ast" or (mode == "auto" and self._ast_parser_available):
            result = self._parse_with_ast(file_path)
            if result is not None:
                return result
            # Fall back to regex if AST parsing failed
        
        # Use regex-based parsing
        return self._parse_with_regex(file_path)

    def _parse_with_ast(self, file_path: Path) -> List[ImportInfo] | None:
        """Parse file using acorn AST parser via Node.js subprocess.
        
        Returns None if AST parsing is not available or failed.
        """
        if not self._ast_parser_available:
            return None
            
        try:
            result = subprocess.run(
                ["node", str(JS_AST_PARSER_PATH), str(file_path)],
                capture_output=True,
                text=True,
                timeout=10,
                cwd=JS_AST_PARSER_PATH.parent,
            )
            
            if result.returncode != 0:
                return None
                
            data = json.loads(result.stdout)
            
            # Check for error response
            if isinstance(data, dict) and data.get("error"):
                return None
            
            # Convert to ImportInfo objects
            imports = []
            for item in data:
                imports.append(
                    ImportInfo(
                        source_file=item["source_file"],
                        imported_module=item["imported_module"],
                        import_type=item["import_type"],
                        line_number=item["line_number"],
                    )
                )
            return imports
            
        except (subprocess.TimeoutExpired, json.JSONDecodeError, KeyError):
            return None

    def _parse_with_regex(self, file_path: Path) -> List[ImportInfo]:
        """Parse file using regex patterns (fallback method)."""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            imports = []

            # Parse ES6 imports: import ... from '...'
            imports.extend(self._parse_es6_imports(content, str(file_path)))

            # Parse CommonJS: require('...')
            imports.extend(self._parse_commonjs_requires(content, str(file_path)))

            # Parse dynamic imports: import('...')
            imports.extend(self._parse_dynamic_imports(content, str(file_path)))

            return imports

        except Exception as e:
            # Return empty list on error
            return []

    def _parse_es6_imports(self, content: str, file_path: str) -> List[ImportInfo]:
        """Parse ES6 import statements."""
        imports = []

        # Match various ES6 import patterns
        patterns = [
            # import defaultExport from "module"
            r"import\s+\w+\s+from\s+['\"]([^'\"]+)['\"]",
            # import * as name from "module"
            r"import\s+\*\s+as\s+\w+\s+from\s+['\"]([^'\"]+)['\"]",
            # import { export } from "module"
            r"import\s+\{[^}]+\}\s+from\s+['\"]([^'\"]+)['\"]",
            # import { export as alias } from "module"
            r"import\s+\{[^}]+as\s+[^}]+\}\s+from\s+['\"]([^'\"]+)['\"]",
            # import defaultExport, { export } from "module"
            r"import\s+\w+\s*,\s*\{[^}]+\}\s+from\s+['\"]([^'\"]+)['\"]",
            # import "module" (side effects)
            r"import\s+['\"]([^'\"]+)['\"]",
        ]

        for i, line in enumerate(content.split("\n"), 1):
            # Skip comments
            if line.strip().startswith("//") or line.strip().startswith("/*"):
                continue

            for pattern in patterns:
                matches = re.finditer(pattern, line)
                for match in matches:
                    module_name = match.group(1)
                    imports.append(
                        ImportInfo(
                            source_file=file_path,
                            imported_module=module_name,
                            import_type="module",
                            line_number=i,
                        )
                    )

        return imports

    def _parse_commonjs_requires(self, content: str, file_path: str) -> List[ImportInfo]:
        """Parse CommonJS require statements."""
        imports = []

        # Match require('module') or require("module")
        pattern = r"require\s*\(\s*['\"]([^'\"]+)['\"]\s*\)"

        for i, line in enumerate(content.split("\n"), 1):
            # Skip comments
            if line.strip().startswith("//") or line.strip().startswith("/*"):
                continue

            matches = re.finditer(pattern, line)
            for match in matches:
                module_name = match.group(1)
                imports.append(
                    ImportInfo(
                        source_file=file_path,
                        imported_module=module_name,
                        import_type="from",
                        line_number=i,
                    )
                )

        return imports

    def _parse_dynamic_imports(self, content: str, file_path: str) -> List[ImportInfo]:
        """Parse dynamic import() statements."""
        imports = []

        # Match import('module') or import("module")
        pattern = r"import\s*\(\s*['\"]([^'\"]+)['\"]\s*\)"

        for i, line in enumerate(content.split("\n"), 1):
            # Skip comments
            if line.strip().startswith("//") or line.strip().startswith("/*"):
                continue

            matches = re.finditer(pattern, line)
            for match in matches:
                module_name = match.group(1)
                imports.append(
                    ImportInfo(
                        source_file=file_path,
                        imported_module=module_name,
                        import_type="module",
                        line_number=i,
                    )
                )

        return imports


class TypeScriptParser(JavaScriptParser):
    """Parser for TypeScript files (extends JavaScript parser)."""

    def get_supported_extensions(self) -> List[str]:
        """Get supported file extensions."""
        return [".ts", ".tsx"]

    def parse_file(self, file_path: Path) -> List[ImportInfo]:
        """Parse a TypeScript file and extract import statements.

        Args:
            file_path: Path to the file

        Returns:
            List of ImportInfo objects
        """
        # Use JavaScript parser as base
        imports = super().parse_file(file_path)

        # Add TypeScript-specific imports
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            # Parse type imports: import type { ... } from '...'
            imports.extend(self._parse_type_imports(content, str(file_path)))

        except Exception:
            pass

        return imports

    def _parse_type_imports(self, content: str, file_path: str) -> List[ImportInfo]:
        """Parse TypeScript type-only imports."""
        imports = []

        # Match: import type { Type } from "module"
        pattern = r"import\s+type\s+\{[^}]+\}\s+from\s+['\"]([^'\"]+)['\"]"

        for i, line in enumerate(content.split("\n"), 1):
            if line.strip().startswith("//") or line.strip().startswith("/*"):
                continue

            matches = re.finditer(pattern, line)
            for match in matches:
                module_name = match.group(1)
                imports.append(
                    ImportInfo(
                        source_file=file_path,
                        imported_module=module_name,
                        import_type="from",
                        line_number=i,
                    )
                )

        return imports
