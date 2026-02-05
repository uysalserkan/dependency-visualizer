"""Extract ZIP archives to a temporary directory with size and path-traversal safety."""

import io
import shutil
import tempfile
import zipfile
from pathlib import Path

from app.core.exceptions import ValidationError
from app.core.logging import get_logger

logger = get_logger(__name__)


def extract_zip_to_temp(
    zip_content: bytes,
    max_compressed_mb: int,
    max_uncompressed_mb: int,
) -> Path:
    """Extract a ZIP archive to a temporary directory.

    Enforces max compressed size, max uncompressed size (zip bomb protection),
    and safe path handling (no path traversal outside the extract root).

    Args:
        zip_content: Raw bytes of the ZIP file.
        max_compressed_mb: Maximum allowed size of zip_content in MB.
        max_uncompressed_mb: Maximum total uncompressed size in MB.

    Returns:
        Path to the temporary directory containing extracted files.
        Caller must remove this directory when done (e.g. shutil.rmtree).

    Raises:
        ValidationError: If size limits exceeded or ZIP is invalid.
    """
    max_compressed_bytes = max_compressed_mb * 1024 * 1024
    max_uncompressed_bytes = max_uncompressed_mb * 1024 * 1024

    if len(zip_content) > max_compressed_bytes:
        raise ValidationError(
            f"ZIP file too large (max {max_compressed_mb} MB)",
            details={"size_mb": len(zip_content) / (1024 * 1024), "max_mb": max_compressed_mb},
        )

    extract_path = None
    try:
        extract_path = Path(tempfile.mkdtemp(prefix="dependency_visualizer_zip_"))
        total_uncompressed = 0

        with zipfile.ZipFile(io.BytesIO(zip_content), "r") as zf:
            for info in zf.infolist():
                total_uncompressed += info.file_size
                if total_uncompressed > max_uncompressed_bytes:
                    raise ValidationError(
                        "ZIP uncompressed size exceeds limit (possible zip bomb)",
                        details={
                            "max_uncompressed_mb": max_uncompressed_mb,
                        },
                    )

                # Safe name: resolve to avoid path traversal (e.g. ".." or absolute)
                name = info.filename
                if name.startswith("/"):
                    name = name.lstrip("/")
                parts = Path(name).parts
                safe_parts = []
                for p in parts:
                    if p in ("", "."):
                        continue
                    if p == "..":
                        raise ValidationError(
                            "ZIP contains invalid path (path traversal)",
                            details={"entry": name},
                        )
                    safe_parts.append(p)
                if not safe_parts:
                    continue
                target = extract_path.joinpath(*safe_parts)

                if info.is_dir():
                    target.mkdir(parents=True, exist_ok=True)
                else:
                    target.parent.mkdir(parents=True, exist_ok=True)
                    with zf.open(info) as src:
                        with open(target, "wb") as dst:
                            shutil.copyfileobj(src, dst)

        logger.debug("ZIP extracted", path=str(extract_path), entries=len(list(extract_path.rglob("*"))))
        return extract_path

    except zipfile.BadZipFile as e:
        if extract_path and extract_path.exists():
            shutil.rmtree(extract_path, ignore_errors=True)
        raise ValidationError("Invalid or corrupted ZIP file", details={"error": str(e)}) from e
    except ValidationError:
        if extract_path and extract_path.exists():
            shutil.rmtree(extract_path, ignore_errors=True)
        raise
    except Exception as e:
        if extract_path and extract_path.exists():
            shutil.rmtree(extract_path, ignore_errors=True)
        logger.exception("ZIP extraction failed")
        raise ValidationError("Failed to extract ZIP", details={"error": str(e)}) from e
