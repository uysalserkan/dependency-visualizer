"""Parallel file parsing for improved performance."""

import multiprocessing as mp
from pathlib import Path
from typing import List

from app.api.models import ImportInfo
from app.config import settings
from app.core.go_extractor import _go_extractor_available, extract_with_go
from app.core.parser.factory import ParserRegistry


def _should_use_go_extractor(override: str | None = None) -> bool:
    """True if we should attempt to use the Go extractor.

    override: per-request override from API ("python" | "go" | None).
    When None, uses EXTRACTOR_BACKEND config.
    """
    backend = override if override is not None else getattr(settings, "EXTRACTOR_BACKEND", "auto")
    if backend == "python":
        return False
    if backend == "go":
        return _go_extractor_available()
    # auto: use Go only if available
    return _go_extractor_available()


def _parse_file_worker(file_path: Path) -> tuple[Path, list[ImportInfo], str | None]:
    """Worker function for parallel file parsing.

    Args:
        file_path: Path to the file to parse

    Returns:
        Tuple of (file_path, imports, error_message)
    """
    try:
        parser = ParserRegistry.get_parser(file_path)
        if parser:
            imports = parser.parse_file(file_path)
            return (file_path, imports, None)
        return (file_path, [], None)
    except Exception as e:
        return (file_path, [], str(e))


class ParallelParser:
    """Parse multiple files in parallel using multiprocessing."""

    def __init__(self, max_workers: int | None = None):
        """Initialize parallel parser.

        Args:
            max_workers: Maximum number of worker processes (defaults to CPU count)
        """
        self.max_workers = max_workers or mp.cpu_count()

    def parse_files(
        self,
        files: list[Path],
        project_path: Path,
        extractor_backend: str | None = None,
    ) -> tuple[list[ImportInfo], list[str]]:
        """Parse multiple files in parallel.

        Extractor is chosen by EXTRACTOR_BACKEND: "auto" (Go if available),
        "python" (always Python), or "go" (Go; falls back to Python if unavailable).

        Args:
            files: List of file paths to parse
            project_path: Root project path for relative error messages

        Returns:
            Tuple of (all_imports, warnings)
        """
        go_fallback_warnings: list[str] = []
        backend = extractor_backend if extractor_backend is not None else getattr(settings, "EXTRACTOR_BACKEND", "auto")
        if backend == "go" and not _go_extractor_available():
            go_fallback_warnings.append(
                "Extractor backend=go but Go extractor not found (GO_EXTRACTOR_PATH missing or not executable); using Python parsers"
            )
        if _should_use_go_extractor(extractor_backend) and files:
            try:
                return extract_with_go(files, project_path)
            except Exception as e:
                go_fallback_warnings = [f"Go extractor failed, using Python parsers: {e}"]

        all_imports = []
        warnings = list(go_fallback_warnings)

        # For small projects, use sequential parsing (overhead not worth it)
        if len(files) < 10:
            for file_path in files:
                _, imports, error = _parse_file_worker(file_path)
                if error:
                    warnings.append(f"Error parsing {file_path.relative_to(project_path)}: {error}")
                elif not imports and file_path.stat().st_size > 0:
                    warnings.append(f"Could not parse {file_path.relative_to(project_path)}")
                all_imports.extend(imports)
            return all_imports, warnings

        # Use parallel processing for larger projects
        try:
            with mp.Pool(processes=self.max_workers) as pool:
                results = pool.map(_parse_file_worker, files)

            for file_path, imports, error in results:
                if error:
                    warnings.append(f"Error parsing {file_path.relative_to(project_path)}: {error}")
                elif not imports and file_path.stat().st_size > 0:
                    warnings.append(f"Could not parse {file_path.relative_to(project_path)}")
                all_imports.extend(imports)

        except Exception as e:
            # Fallback to sequential if parallel fails
            warnings.append(f"Parallel parsing failed, using sequential: {str(e)}")
            for file_path in files:
                _, imports, error = _parse_file_worker(file_path)
                if error:
                    warnings.append(f"Error parsing {file_path.relative_to(project_path)}: {error}")
                elif not imports and file_path.stat().st_size > 0:
                    warnings.append(f"Could not parse {file_path.relative_to(project_path)}")
                all_imports.extend(imports)

        return all_imports, warnings
