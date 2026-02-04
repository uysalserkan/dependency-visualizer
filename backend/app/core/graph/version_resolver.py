"""Resolve installed version for external packages (Python PyPI, npm, etc.)."""

from __future__ import annotations


def get_external_package_version(module_name: str) -> str | None:
    """Return the installed version for an external package, if resolvable.

    Tries Python (importlib.metadata) first; can be extended for npm/Go/Java.
    Returns None for stdlib, internal modules, or when version cannot be determined.

    Args:
        module_name: Canonical module/package name (e.g. "requests", "requests.models").

    Returns:
        Version string (e.g. "2.31.0") or None.
    """
    if not module_name or not module_name.strip():
        return None
    # Python: top-level distribution name (e.g. "requests" from "requests.models")
    try:
        import importlib.metadata

        dist_name = module_name.split(".")[0].strip()
        if not dist_name:
            return None
        return importlib.metadata.version(dist_name)
    except Exception:
        pass
    return None
