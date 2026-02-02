"""Python import resolver."""

from pathlib import Path

from app.core.graph.resolvers.base import ImportResolver

# Top-level Python standard library module names (common subset; full list is large).
# Used to classify external imports as "stdlib" vs "package".
PYTHON_STDLIB_TOPLEVEL = frozenset({
    "abc", "aifc", "argparse", "array", "ast", "asynchat", "asyncio", "asyncore",
    "base64", "bdb", "binascii", "bisect", "builtins", "bz2", "calendar", "cgi",
    "cgitb", "chunk", "cmath", "cmd", "code", "codecs", "codeop", "collections",
    "colorsys", "compileall", "concurrent", "configparser", "contextlib", "contextvars",
    "copy", "copyreg", "cProfile", "crypt", "csv", "ctypes", "curses", "dataclasses",
    "datetime", "dbm", "decimal", "difflib", "dis", "distutils", "doctest", "email",
    "encodings", "enum", "errno", "faulthandler", "fcntl", "filecmp", "fileinput",
    "fnmatch", "fractions", "ftplib", "functools", "gc", "getopt", "getpass", "gettext",
    "glob", "graphlib", "grp", "gzip", "hashlib", "heapq", "hmac", "html", "http",
    "idlelib", "imaplib", "imghdr", "imp", "importlib", "inspect", "io", "ipaddress",
    "itertools", "json", "keyword", "lib2to3", "linecache", "locale", "logging",
    "lzma", "mailbox", "mailcap", "marshal", "math", "mimetypes", "mmap", "modulefinder",
    "multiprocessing", "netrc", "nis", "nntplib", "numbers", "operator", "optparse",
    "os", "ossaudiodev", "pathlib", "pdb", "pickle", "pickletools", "pipes", "pkgutil",
    "platform", "plistlib", "poplib", "posix", "posixpath", "pprint", "profile",
    "pstats", "pty", "pwd", "py_compile", "pyclbr", "pydoc", "queue", "quopri",
    "random", "re", "readline", "reprlib", "resource", "rlcompleter", "runpy",
    "sched", "secrets", "select", "selectors", "shelve", "shlex", "shutil", "signal",
    "site", "smtpd", "smtplib", "sndhdr", "socket", "socketserver", "spwd", "sqlite3",
    "ssl", "stat", "statistics", "string", "stringprep", "struct", "subprocess",
    "sunau", "sunaudio", "symtable", "sys", "sysconfig", "syslog", "tabnanny",
    "tarfile", "telnetlib", "tempfile", "termios", "test", "textwrap", "threading",
    "time", "timeit", "tkinter", "token", "tokenize", "trace", "traceback", "tracemalloc",
    "tty", "turtle", "turtledemo", "types", "typing", "unicodedata", "unittest", "urllib",
    "uu", "uuid", "venv", "warnings", "wave", "weakref", "webbrowser", "winreg",
    "winsound", "wsgiref", "xdrlib", "xml", "xmlrpc", "zipapp", "zipfile", "zipimport",
    "zlib", "_thread",
})


class PythonImportResolver(ImportResolver):
    """Resolve Python imports (absolute and relative)."""

    def get_supported_extensions(self) -> list[str]:
        """Get supported Python file extensions."""
        return [".py", ".pyi"]

    def resolve_import(self, source_file: str, import_module: str) -> str | None:
        """Resolve a Python import to a file path.

        Handles:
        - Relative imports: .module, ..package.module
        - Absolute imports: package.module
        - Package __init__.py resolution

        Args:
            source_file: Absolute path to Python file containing import
            import_module: Raw imported module (e.g. "utils", ".models", "..config")

        Returns:
            Absolute path to resolved .py file, or None if external
        """
        # Handle relative imports (.x, ..x)
        if import_module.startswith("."):
            return self._resolve_relative_import(source_file, import_module)
        else:
            return self._resolve_absolute_import(import_module)

    def _resolve_relative_import(self, source_file: str, import_module: str) -> str | None:
        """Resolve relative Python import (starts with .)."""
        source_path = Path(source_file).resolve().parent
        level = len(import_module) - len(import_module.lstrip("."))
        module_name = import_module.lstrip(".")

        # Go up 'level' directories (level=1 means current dir, level=2 means parent, etc.)
        for _ in range(level - 1):
            source_path = source_path.parent

        # Try to resolve the module
        if module_name:
            module_path = source_path / module_name.replace(".", "/")
        else:
            module_path = source_path

        return self._try_resolve_python_path(module_path)

    def _resolve_absolute_import(self, import_module: str) -> str | None:
        """Resolve absolute Python import within project."""
        module_path = self.project_root / import_module.replace(".", "/")
        return self._try_resolve_python_path(module_path)

    def _try_resolve_python_path(self, module_path: Path) -> str | None:
        """Try to resolve a module path to an actual Python file.

        Checks (in order):
        1. {module_path}/__init__.py (package)
        2. {module_path}.py (module file)
        3. {parent}/{name}.py (fallback)

        Args:
            module_path: Path to check

        Returns:
            Absolute path to .py file, or None if not found in project
        """
        # Check if it's a package (has __init__.py)
        init_file = module_path / "__init__.py"
        if init_file.exists() and self._is_in_project(init_file):
            return str(init_file.resolve())

        # Check if it's a module file (exact path + .py)
        py_file = module_path.with_suffix(".py")
        if py_file.exists() and self._is_in_project(py_file):
            return str(py_file.resolve())

        # Check if it's a module in parent directory
        py_file_alt = module_path.parent / f"{module_path.name}.py"
        if py_file_alt.exists() and self._is_in_project(py_file_alt):
            return str(py_file_alt.resolve())

        return None

    def is_stdlib(self, source_file: str, import_module: str) -> bool:
        """True if the import is Python standard library (not third-party)."""
        if import_module.startswith("."):
            return False
        top_level = import_module.split(".")[0].strip()
        return top_level in PYTHON_STDLIB_TOPLEVEL
