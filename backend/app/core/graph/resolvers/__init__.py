"""Import resolution strategies for different languages."""

from app.core.graph.resolvers.base import ImportResolver
from app.core.graph.resolvers.factory import get_resolver
from app.core.graph.resolvers.javascript import JavaScriptImportResolver
from app.core.graph.resolvers.python import PythonImportResolver
from app.core.graph.resolvers.go import GoImportResolver

__all__ = [
    "ImportResolver",
    "get_resolver",
    "PythonImportResolver",
    "JavaScriptImportResolver",
    "GoImportResolver",
]
