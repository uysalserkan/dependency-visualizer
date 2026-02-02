"""Invoke the Go-based extractor binary for fast import extraction."""

import json
import subprocess
from pathlib import Path

from app.api.models import ImportInfo
from app.config import settings


def _go_extractor_available() -> bool:
    """Return True if GO_EXTRACTOR_PATH is set and the binary exists and is executable."""
    path = getattr(settings, "GO_EXTRACTOR_PATH", None)
    if not path:
        return False
    p = Path(path).expanduser().resolve()
    return p.is_file() and bool(p.stat().st_mode & 0o111)


def extract_with_go(
    files: list[Path], project_path: Path
) -> tuple[list[ImportInfo], list[str]]:
    """Run the Go extractor on the given files. Returns (imports, warnings).

    Raises:
        FileNotFoundError: If the extractor binary is not found.
        subprocess.TimeoutExpired: If the extractor does not finish in time.
    """
    extractor_path = Path(settings.GO_EXTRACTOR_PATH or "").expanduser().resolve()
    if not extractor_path.is_file():
        raise FileNotFoundError(f"Go extractor not found: {extractor_path}")

    request = {
        "files": [str(p.resolve()) for p in files],
        "project_path": str(project_path.resolve()),
    }
    payload = json.dumps(request).encode("utf-8")

    proc = subprocess.run(
        [str(extractor_path)],
        input=payload,
        capture_output=True,
        timeout=max(60, len(files) // 10 + 30),
        cwd=str(project_path),
    )
    out = proc.stdout.decode("utf-8", errors="replace").strip()
    if not out and proc.stderr:
        out = proc.stderr.decode("utf-8", errors="replace").strip()
    try:
        data = json.loads(out)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Go extractor returned invalid JSON: {e}") from e

    imports_raw = data.get("imports") or []
    warnings = list(data.get("warnings") or [])

    imports = []
    for row in imports_raw:
        imports.append(
            ImportInfo(
                source_file=row["source_file"],
                imported_module=row["imported_module"],
                import_type=row.get("import_type", "module"),
                line_number=int(row.get("line_number", 0)),
            )
        )
    return imports, warnings
