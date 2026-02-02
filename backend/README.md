# Import Visualizer Backend

FastAPI backend service for analyzing Python import dependencies.

## Setup

### Prerequisites
- Python 3.11+
- [uv](https://github.com/astral-sh/uv) package manager

### Installation

```bash
# Install dependencies
uv sync

# Install with dev dependencies
uv sync --dev
```

### Running the Server

```bash
# Development mode with auto-reload
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

## API Endpoints

### POST /api/analyze
Analyze a Python project and return dependency graph.

**Request:**
```json
{
  "project_path": "/path/to/project",
  "include_external": false,
  "ignore_patterns": [".venv", "__pycache__"]
}
```

**Response:**
```json
{
  "id": "uuid",
  "project_path": "/path/to/project",
  "nodes": [...],
  "edges": [...],
  "metrics": {
    "total_files": 42,
    "total_imports": 156,
    "circular_dependencies": [],
    "max_import_depth": 5,
    "isolated_modules": []
  },
  "warnings": []
}
```

### GET /api/analysis/{analysis_id}
Retrieve a cached analysis result.

### DELETE /api/analysis/{analysis_id}
Delete a cached analysis result.

## Development

### Code Quality

```bash
# Format code
uv run ruff format .

# Lint code
uv run ruff check .

# Fix linting issues
uv run ruff check --fix .
```

### Testing (optional)

All test-related scripts are optional; build and run do not depend on them. Install dev dependencies first: `uv sync --extra dev`.

```bash
# Run all tests
uv run test

# With coverage
uv run test:cov

# Verbose
uv run test:verbose
```

## Architecture

- **Parser Layer**: AST-based import extraction
- **Graph Layer**: NetworkX-based dependency analysis
- **API Layer**: FastAPI REST endpoints
- **Extensible**: Plugin system for additional languages
