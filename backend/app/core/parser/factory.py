"""Parser factory and registry for managing language parsers."""

from pathlib import Path

from app.core.parser.base import LanguageParser
from app.core.parser.python import PythonParser
from app.core.parser.javascript import JavaScriptParser, TypeScriptParser
from app.core.parser.go import GoParser
from app.core.parser.java import JavaParser
from app.core.parser.ruby import RubyParser
from app.core.parser.cpp import CppParser
from app.core.parser.rust import RustParser


class ParserRegistry:
    """Registry for managing language-specific parsers."""

    _parsers: dict[str, LanguageParser] = {}
    _initialized = False

    @classmethod
    def _initialize(cls):
        """Initialize the registry with default parsers."""
        if not cls._initialized:
            try:
                # Register Python parser
                python_parser = PythonParser()
                for ext in python_parser.get_supported_extensions():
                    cls._parsers[ext] = python_parser

                # Register JavaScript parser
                js_parser = JavaScriptParser()
                for ext in [".js", ".jsx", ".mjs", ".cjs"]:
                    cls._parsers[ext] = js_parser

                # Register TypeScript parser
                ts_parser = TypeScriptParser()
                for ext in [".ts", ".tsx"]:
                    cls._parsers[ext] = ts_parser

                # Register Go parser
                go_parser = GoParser()
                for ext in go_parser.get_supported_extensions():
                    cls._parsers[ext] = go_parser

                # Register Java parser
                java_parser = JavaParser()
                for ext in java_parser.get_supported_extensions():
                    cls._parsers[ext] = java_parser

                # Register Ruby parser
                ruby_parser = RubyParser()
                for ext in ruby_parser.get_supported_extensions():
                    cls._parsers[ext] = ruby_parser

                # Register C/C++ parser
                cpp_parser = CppParser()
                for ext in cpp_parser.get_supported_extensions():
                    cls._parsers[ext] = cpp_parser

                # Register Rust parser
                rust_parser = RustParser()
                for ext in rust_parser.get_supported_extensions():
                    cls._parsers[ext] = rust_parser

                cls._initialized = True
            except Exception as e:
                # Log initialization errors but don't crash
                import sys
                print(f"ParserRegistry initialization error: {e}", file=sys.stderr)
                # At least mark as initialized to avoid infinite retry
                cls._initialized = True

    @classmethod
    def get_parser(cls, file_path: Path) -> LanguageParser | None:
        """Get the appropriate parser for a file.

        Args:
            file_path: Path to the file

        Returns:
            Parser instance if supported, None otherwise
        """
        cls._initialize()
        extension = file_path.suffix
        return cls._parsers.get(extension)

    @classmethod
    def register_parser(cls, parser: LanguageParser):
        """Register a new parser.

        Args:
            parser: Parser instance to register
        """
        for ext in parser.get_supported_extensions():
            cls._parsers[ext] = parser

    @classmethod
    def get_supported_extensions(cls) -> list[str]:
        """Get all supported file extensions.

        Returns:
            List of supported extensions
        """
        cls._initialize()
        return list(cls._parsers.keys())

    @classmethod
    def get_supported_languages(cls) -> list[str]:
        """Get list of supported programming languages.

        Returns:
            List of language names
        """
        cls._initialize()
        languages = set()
        for parser in cls._parsers.values():
            # Get parser class name and extract language
            parser_name = parser.__class__.__name__
            if "Python" in parser_name:
                languages.add("Python")
            elif "JavaScript" in parser_name:
                languages.add("JavaScript")
            elif "TypeScript" in parser_name:
                languages.add("TypeScript")
            elif "Go" in parser_name:
                languages.add("Go")
            elif "Java" in parser_name:
                languages.add("Java")
            elif "Ruby" in parser_name:
                languages.add("Ruby")
            elif "Cpp" in parser_name:
                languages.add("C/C++")
            elif "Rust" in parser_name:
                languages.add("Rust")
        return sorted(list(languages))
