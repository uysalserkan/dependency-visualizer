"""Tests for repository clone and URL validation."""

import pytest

from app.core.exceptions import ValidationError
from app.core.repository import (
    normalize_repository_url,
    remove_clone,
    repo_cache_id,
    validate_repository_url,
)


def test_normalize_repository_url():
    """Test URL normalization for cache keys."""
    assert normalize_repository_url("https://github.com/user/repo") == "https://github.com/user/repo"
    assert normalize_repository_url("https://github.com/user/repo/") == "https://github.com/user/repo"
    assert normalize_repository_url("https://github.com/user/repo.git") == "https://github.com/user/repo"
    # Host is lowercased; path is preserved
    assert normalize_repository_url("https://GitHub.com/User/Repo") == "https://github.com/User/Repo"


def test_validate_repository_url_empty():
    """Empty URL should raise."""
    with pytest.raises(ValidationError) as exc_info:
        validate_repository_url("")
    assert "required" in str(exc_info.value).lower() or "url" in str(exc_info.value).lower()


def test_validate_repository_url_only_https():
    """Only HTTPS allowed."""
    with pytest.raises(ValidationError) as exc_info:
        validate_repository_url("http://github.com/user/repo")
    assert "https" in str(exc_info.value).lower()

    with pytest.raises(ValidationError):
        validate_repository_url("git@github.com:user/repo.git")


def test_validate_repository_url_invalid():
    """Invalid URL should raise."""
    with pytest.raises(ValidationError):
        validate_repository_url("https://")
    with pytest.raises(ValidationError):
        validate_repository_url("https://github.com")


def test_validate_repository_url_allowed_host(monkeypatch):
    """Allowed host should pass."""
    monkeypatch.setattr("app.core.repository.settings.REPOSITORY_ALLOWED_HOSTS", ["github.com"])
    validate_repository_url("https://github.com/user/repo")
    validate_repository_url("https://github.com/org/project.git")


def test_validate_repository_url_disallowed_host(monkeypatch):
    """Disallowed host should raise."""
    monkeypatch.setattr("app.core.repository.settings.REPOSITORY_ALLOWED_HOSTS", ["github.com"])
    with pytest.raises(ValidationError) as exc_info:
        validate_repository_url("https://evil.com/user/repo")
    assert "not allowed" in str(exc_info.value).lower() or "allowed" in str(exc_info.value).lower()


def test_remove_clone_nonexistent(tmp_path):
    """Removing non-existent path should not raise."""
    remove_clone(tmp_path / "does_not_exist")


def test_repo_cache_id_deterministic():
    """Same url+ref must give same cache id."""
    url = "https://github.com/user/repo"
    assert repo_cache_id(url, None) == repo_cache_id(url, None)
    assert repo_cache_id(url, "main") == repo_cache_id(url, "main")
    assert repo_cache_id(url, None) != repo_cache_id(url, "main")


def test_repo_cache_id_prefix():
    """Cache id must have repo_ prefix."""
    assert repo_cache_id("https://github.com/a/b", None).startswith("repo_")
    assert repo_cache_id("https://github.com/a/b", "main").startswith("repo_")
