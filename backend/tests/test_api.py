"""Tests for API endpoints."""

import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@pytest.fixture
def temp_project():
    """Create a temporary Python project for testing."""
    with tempfile.TemporaryDirectory() as tmpdir:
        project_path = Path(tmpdir)

        # Create a simple Python project
        (project_path / "main.py").write_text("import utils\n")
        (project_path / "utils.py").write_text("import os\nimport sys\n")

        yield str(project_path)


def test_health_check():
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_analyze_project(temp_project):
    """Test project analysis endpoint."""
    response = client.post(
        "/api/analyze", json={"project_path": temp_project, "include_external": False}
    )

    assert response.status_code == 200
    data = response.json()

    assert "id" in data
    assert "nodes" in data
    assert "edges" in data
    assert "metrics" in data
    assert len(data["nodes"]) >= 2
    assert len(data["edges"]) >= 1


def test_analyze_invalid_path():
    """Test analysis with invalid path."""
    response = client.post(
        "/api/analyze", json={"project_path": "/nonexistent/path", "include_external": False}
    )

    assert response.status_code == 400
    assert "does not exist" in response.json()["detail"]


def test_get_analysis(temp_project):
    """Test retrieving analysis result."""
    # First analyze a project
    response = client.post(
        "/api/analyze", json={"project_path": temp_project, "include_external": False}
    )
    analysis_id = response.json()["id"]

    # Then retrieve it
    response = client.get(f"/api/analysis/{analysis_id}")
    assert response.status_code == 200
    assert response.json()["id"] == analysis_id


def test_get_nonexistent_analysis():
    """Test retrieving non-existent analysis."""
    response = client.get("/api/analysis/nonexistent-id")
    assert response.status_code == 404


def test_delete_analysis(temp_project):
    """Test deleting analysis."""
    # First analyze a project
    response = client.post(
        "/api/analyze", json={"project_path": temp_project, "include_external": False}
    )
    analysis_id = response.json()["id"]

    # Then delete it
    response = client.delete(f"/api/analysis/{analysis_id}")
    assert response.status_code == 200

    # Verify it's gone
    response = client.get(f"/api/analysis/{analysis_id}")
    assert response.status_code == 404


def test_cache_stats():
    """Test cache statistics endpoint."""
    response = client.get("/api/cache/stats")
    assert response.status_code == 200
    data = response.json()

    assert "total_entries" in data
    assert "unique_projects" in data
    assert "total_size_bytes" in data


def test_get_insights(temp_project):
    """Test insights endpoint."""
    # First analyze a project
    response = client.post(
        "/api/analyze", json={"project_path": temp_project, "include_external": False}
    )
    analysis_id = response.json()["id"]

    # Get insights
    response = client.get(f"/api/analysis/{analysis_id}/insights")
    assert response.status_code == 200
    data = response.json()

    assert "health_score" in data
    assert "health_status" in data
    assert "insights" in data
    assert "summary" in data
    assert "recommendations" in data
    assert 0 <= data["health_score"] <= 100
    summary = data["summary"]
    assert "total_files" in summary
    assert "circular_dependencies" in summary
    assert "isolated_modules" in summary
    assert "max_depth" in summary


def test_export_json(temp_project):
    """Test JSON export."""
    # First analyze a project
    response = client.post(
        "/api/analyze", json={"project_path": temp_project, "include_external": False}
    )
    analysis_id = response.json()["id"]

    # Export as JSON
    response = client.get(f"/api/analysis/{analysis_id}/export?format=json")
    assert response.status_code == 200
    assert "application/json" in response.headers["content-type"]
