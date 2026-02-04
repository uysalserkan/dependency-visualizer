"""Git blame helper: latest commit info for a file under a project root."""

import subprocess
from pathlib import Path


GIT_BLAME_TIMEOUT = 3


def get_file_blame(project_root: Path, file_path: Path) -> dict | None:
    """Return the latest commit info for a file under the project root.

    Args:
        project_root: Repository root directory.
        file_path: Resolved path to the file (must be under project_root; caller
            ensures this via sanitize_file_path).

    Returns:
        Dict with commit_hash, subject, author_name, author_email, date,
        or None if not a git repo, file not tracked, or command fails.
    """
    try:
        project_root = Path(project_root).resolve()
        file_path = Path(file_path).resolve()
        if not file_path.is_relative_to(project_root):
            return None
        rel_path = file_path.relative_to(project_root)
        # Use forward slashes for git on Windows
        rel_str = str(rel_path).replace("\\", "/")
    except (ValueError, TypeError):
        return None

    fmt = "%H%n%s%n%an%n%ae%n%ai"
    try:
        result = subprocess.run(
            ["git", "-C", str(project_root), "log", "-1", f"--format={fmt}", "--", rel_str],
            capture_output=True,
            text=True,
            timeout=GIT_BLAME_TIMEOUT,
            check=False,
        )
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
        return None

    if result.returncode != 0 or not result.stdout.strip():
        return None

    lines = result.stdout.strip().split("\n")
    if len(lines) < 5:
        return None

    return {
        "commit_hash": lines[0].strip(),
        "subject": lines[1].strip(),
        "author_name": lines[2].strip(),
        "author_email": lines[3].strip(),
        "date": lines[4].strip(),
    }
