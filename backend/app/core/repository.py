"""Clone and validate Git repositories for analysis."""

import hashlib
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urlparse

from app.config import settings
from app.core.exceptions import ValidationError
from app.core.logging import get_logger

logger = get_logger(__name__)

# Prefix for repository cache IDs (so they don't collide with UUID-style analysis IDs)
REPO_CACHE_ID_PREFIX = "repo_"

# HTTPS URL pattern (optional .git suffix)
GIT_HTTPS_PATTERN = re.compile(
    r"^https://[a-zA-Z0-9][-a-zA-Z0-9.]*[a-zA-Z0-9](/[a-zA-Z0-9_.-]+)+\.git?$"
    r"|^https://[a-zA-Z0-9][-a-zA-Z0-9.]*[a-zA-Z0-9](/[a-zA-Z0-9_.-]+)+/?$",
    re.IGNORECASE,
)


def repo_cache_id(repository_url: str, branch: str | None = None) -> str:
    """Compute a deterministic cache ID for a repository + ref.

    Same (url, ref) always yields the same ID so we can cache and reuse.

    Args:
        repository_url: HTTPS Git URL
        branch: Branch, tag, or commit (None = default branch)

    Returns:
        Cache key string, e.g. repo_a1b2c3d4e5f6...
    """
    ref = (branch or "default").strip()
    normalized = normalize_repository_url(repository_url)
    raw = f"{normalized}:{ref}"
    h = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:24]
    return f"{REPO_CACHE_ID_PREFIX}{h}"


def normalize_repository_url(url: str) -> str:
    """Normalize URL for comparison and cache keys.

    - Strip trailing slashes and optional .git
    - Lowercase host
    """
    url = url.strip()
    if url.endswith(".git"):
        url = url[:-4]
    url = url.rstrip("/")
    parsed = urlparse(url)
    netloc = parsed.netloc.lower()
    path = parsed.path.rstrip("/") or "/"
    return f"{parsed.scheme}://{netloc}{path}"


def validate_repository_url(url: str) -> None:
    """Validate repository URL and host allowlist.

    Raises:
        ValidationError: If URL is invalid or host not allowed
    """
    if not url or not url.strip():
        raise ValidationError("Repository URL is required", details={"url": url})

    url = url.strip()

    if not url.startswith("https://"):
        raise ValidationError(
            "Only HTTPS repository URLs are allowed",
            details={"url": url[:80]},
        )

    parsed = urlparse(url)
    if not parsed.netloc or not parsed.path or parsed.path == "/":
        raise ValidationError("Invalid repository URL", details={"url": url[:80]})

    host = parsed.netloc.lower()
    # Strip port if present (e.g. github.com:443 -> github.com)
    host = host.split(":")[0]

    # Check allowed hosts (empty list = allow all)
    allowed = [h.lower() for h in settings.REPOSITORY_ALLOWED_HOSTS]
    if allowed and host not in allowed:
        raise ValidationError(
            f"Repository host '{host}' is not allowed. Add it to REPOSITORY_ALLOWED_HOSTS or set to empty list to allow all.",
            details={"host": host, "allowed_hosts": allowed},
        )


def clone_repository(
    url: str,
    branch: str | None = None,
    depth: int | None = None,
    timeout: int | None = None,
    work_dir: str | Path | None = None,
) -> Path:
    """Clone a Git repository to a temporary directory.

    Args:
        url: HTTPS Git URL
        branch: Branch, tag, or commit to checkout (None = default branch)
        depth: Shallow clone depth (1 = single commit, 0 = full). None = use config
        timeout: Clone timeout in seconds. None = use config
        work_dir: Parent directory for clone. None = system temp

    Returns:
        Path to the cloned repository (caller must clean up)

    Raises:
        ValidationError: If URL invalid or clone fails
    """
    validate_repository_url(url)

    # Default to 'main' if no branch specified (most repos use main as default now)
    if not branch:
        branch = "main"

    depth = depth if depth is not None else settings.REPOSITORY_CLONE_DEPTH
    timeout = timeout or settings.REPOSITORY_CLONE_TIMEOUT
    parent = Path(work_dir) if work_dir else Path(tempfile.gettempdir())
    if settings.REPOSITORY_WORK_DIR:
        parent = Path(settings.REPOSITORY_WORK_DIR)
    parent.mkdir(parents=True, exist_ok=True)

    # Unique dir name to avoid collisions
    dest = parent / f"import_vis_repo_{id(url)}"
    if dest.exists():
        shutil.rmtree(dest, ignore_errors=True)

    cmd = ["git", "clone", "--quiet"]
    if depth and depth > 0:
        cmd.extend(["--depth", str(depth)])
    if branch:
        cmd.extend(["--branch", branch])
    cmd.extend([url, str(dest)])

    logger.info(
        "Cloning repository",
        url=normalize_repository_url(url),
        branch=branch,
        depth=depth,
    )

    try:
        subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=True,
            cwd=str(parent),
        )
    except subprocess.TimeoutExpired:
        if dest.exists():
            shutil.rmtree(dest, ignore_errors=True)
        raise ValidationError(
            "Repository clone timed out",
            details={"timeout_seconds": timeout, "url": url[:80]},
        )
    except subprocess.CalledProcessError as e:
        if dest.exists():
            shutil.rmtree(dest, ignore_errors=True)
        stderr = (e.stderr or "").strip() or (e.stdout or "").strip()
        raise ValidationError(
            "Repository clone failed",
            details={"url": url[:80], "branch": branch, "stderr": stderr[:500]},
        )
    except FileNotFoundError:
        raise ValidationError(
            "Git is not installed or not in PATH",
            details={},
        )

    # Optional: enforce max size
    if settings.REPOSITORY_MAX_SIZE_MB > 0:
        total = sum(f.stat().st_size for f in dest.rglob("*") if f.is_file())
        limit = settings.REPOSITORY_MAX_SIZE_MB * 1024 * 1024
        if total > limit:
            shutil.rmtree(dest, ignore_errors=True)
            raise ValidationError(
                "Repository size exceeds limit",
                details={
                    "size_mb": round(total / (1024 * 1024), 2),
                    "max_mb": settings.REPOSITORY_MAX_SIZE_MB,
                },
            )

    return dest


def remove_clone(path: Path) -> None:
    """Remove a cloned repository directory.

    Args:
        path: Path returned by clone_repository
    """
    try:
        if path.exists():
            shutil.rmtree(path, ignore_errors=True)
            logger.debug("Removed clone", path=str(path))
    except Exception as e:
        logger.warning("Failed to remove clone", path=str(path), error=str(e))
