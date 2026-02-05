"""Factory for creating language-specific import resolvers."""

from pathlib import Path

from app.core.graph.resolvers.base import ImportResolver
from app.core.graph.resolvers.javascript import JavaScriptImportResolver
from app.core.graph.resolvers.python import PythonImportResolver
from app.core.graph.resolvers.go import GoImportResolver
from app.core.graph.resolvers.java import JavaImportResolver
from app.core.graph.resolvers.ruby import RubyImportResolver
from app.core.graph.resolvers.cpp import CppImportResolver
from app.core.graph.resolvers.rust import RustImportResolver


def get_resolver(source_file: str | Path, project_root: Path) -> ImportResolver:
    """Get appropriate import resolver based on file extension.

    Args:
        source_file: Path to source file (determines resolver type)
        project_root: Project root directory

    Returns:
        Language-specific ImportResolver instance
    """
    source_path = Path(source_file)
    ext = source_path.suffix.lower()

    # Python files
    if ext in [".py", ".pyi"]:
        return PythonImportResolver(project_root)

    # JavaScript/TypeScript files
    if ext in [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"]:
        return JavaScriptImportResolver(project_root)

    # Go files
    if ext == ".go":
        return GoImportResolver(project_root)

    # Java files
    if ext == ".java":
        return JavaImportResolver(project_root)

    # Ruby files
    if ext == ".rb":
        return RubyImportResolver(project_root)

    # C/C++ files
    if ext in [".c", ".h", ".cpp", ".hpp", ".cc", ".hh", ".cxx"]:
        return CppImportResolver(project_root)

    # Rust files
    if ext == ".rs":
        return RustImportResolver(project_root)

    # Default to Python resolver (backward compatibility)
    return PythonImportResolver(project_root)
