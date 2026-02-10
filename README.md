# Dependency Visualizer

Make dependency risk visible before it becomes production risk.

Dependency Visualizer gives engineering leaders and platform teams a real-time architecture lens across large codebases. It surfaces hidden coupling, critical dependency paths, and structural risk so teams can plan change with confidence, improve governance, and reduce delivery risk.

![Main Screenshot](imgs/main.png)

![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-green.svg)
![React](https://img.shields.io/badge/React-18.3+-cyan.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)

## Enterprise Value

- **Reduce change failure risk** with dependency impact visibility before releases.
- **Strengthen architecture governance** by continuously monitoring cycles, hubs, and drift.
- **Prioritize remediation with data** using quantified health metrics and severity signals.
- **Improve engineering velocity** by shortening code comprehension and onboarding time.
- **Scale across portfolios** with support for large monorepos and polyglot systems.

## Capabilities

- **Analyze architecture interactively** with searchable dependency graphs and multiple layouts.
- **Identify business-critical modules** with PageRank, betweenness, centrality, and fan-in/out.
- **Detect structural hotspots early** including circular dependencies and tangled SCC clusters.
- **Inspect implementation context** with file preview and import-level detail.
- **Operationalize quality insights** with project health metrics and recommendation signals.
- **Standardize reporting** by exporting JSON, GraphML, GEXF, or PNG for reviews and audits.

## Built for Real-World Polyglot Repos

Supported languages:

- **Python** (`.py`) - full AST parsing with relative/absolute import resolution
- **JavaScript** (`.js`, `.jsx`, `.mjs`, `.cjs`) - ES modules, CommonJS, dynamic imports
- **TypeScript** (`.ts`, `.tsx`) - type imports and path aliases (`@/`, `~/`)
- **Go** (`.go`) - module-aware import handling with stdlib detection
- **Java** (`.java`) - Maven/Gradle/plain Java package resolution
- **Ruby** (`.rb`) - `require`/`require_relative` and gem detection
- **Rust** (`.rs`) - `use`/`mod` parsing with crate awareness
- **C++** (`.cpp`, `.hpp`, `.cc`, `.h`) - system and local `#include` resolution

## Why It Fits Enterprise Teams

- **Architecture-first workflow**: graph, metrics, and module detail in a single decision surface
- **Risk-aware health dashboard**: objective quality and dependency risk indicators
- **Repository flexibility**: analyze local codebases or remote Git repositories
- **Extensible platform design**: plugin-style parser architecture for organization-specific needs
- **Integration-ready API**: automate checks in CI pipelines and internal engineering platforms

## Getting Started (Minimal)

If you want to run it locally, see:

- `docs/QUICKSTART.md` for the fastest setup path
- `backend/README.md` and `frontend/README.md` for service-level details
- API docs once running: `http://localhost:8000/docs`

## Architecture

### Backend (`backend/`)

- **FastAPI** - Modern async web framework
- **Python AST** - Native import parsing (zero external dependencies)
- **NetworkX** - Graph analysis and algorithms
- **Pydantic** - Type-safe data models

Key components:
- `parser/` - Language-specific parsers (Python AST)
- `graph/` - Dependency graph builder and analyzer
- `api/` - REST endpoints

### Frontend (`frontend/`)

- **React 18 + TypeScript** - Type-safe UI components
- **Vite** - Lightning-fast build tool
- **Cytoscape.js** - High-performance graph rendering
- **TailwindCSS** - Modern, utility-first styling
- **Zustand** - Lightweight state management
- **TanStack Query** - Smart data fetching

## API Documentation

Once the backend is running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Key Endpoints

#### POST `/api/analyze`
Analyze a Python project and return dependency graph with importance scores.

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
  "nodes": [{
    "id": "file.py",
    "pagerank": 0.15,
    "betweenness": 0.08,
    ...
  }],
  "edges": [...],
  "metrics": {
    "total_files": 42,
    "total_imports": 156,
    "circular_dependencies": [],
    "max_import_depth": 5,
    "cycle_details": [...],
    "statistics": {
      "avg_imports_per_file": 3.7,
      "hub_modules": [...]
    }
  }
}
```

#### GET `/api/analysis/{id}/file-preview` (Phase 2)
Get file content and import details.

**Query Parameters:**
- `file_path`: Path to the file

**Response:**
```json
{
  "file_path": "/path/to/file.py",
  "content": "import os\n...",
  "line_count": 150,
  "size_bytes": 4096,
  "imports": [...]
}
```

#### GET `/api/analysis/{id}/export` (Phase 2)
Export graph in various formats.

**Query Parameters:**
- `format`: `json`, `graphml`, or `gexf`

Returns downloadable file.

#### GET `/api/analysis/{id}/insights` (Phase 2)
Get automated insights and recommendations.

**Response:**
```json
{
  "health_score": 85,
  "health_status": "good",
  "insights": [
    {
      "type": "warning",
      "title": "Circular Dependencies Detected",
      "severity": "medium"
    }
  ],
  "recommendations": [
    {
      "title": "Break Circular Dependencies",
      "priority": "high"
    }
  ]
}
```

## Development

**All test-related scripts are optional.** Scripts whose name contains `test` (e.g. `test`, `test:ci`, `test:cov`) are not required for build or run. Use them only when you want to run tests.

### Backend

```bash
cd backend

# Format code
uv run ruff format .

# Lint
uv run ruff check .

# Optional: run tests (requires: uv sync --extra dev)
uv run test
uv run test:cov      # with coverage
uv run test:verbose  # verbose output
```

### Frontend

```bash
cd frontend

# Type check
pnpm tsc

# Lint
pnpm lint

# Build for production
pnpm build

# Preview production build
pnpm preview

# Optional: test scripts (no runner configured by default)
pnpm test
pnpm test:ci
```

## Project Structure

```
dependency_visualizer/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # REST endpoints
│   │   ├── core/
│   │   │   ├── parser/     # AST parsers
│   │   │   └── graph/      # Graph analysis
│   │   └── main.py         # FastAPI app
│   ├── tests/
│   └── pyproject.toml
│
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # Utilities & API
│   │   ├── stores/         # Zustand stores
│   │   └── types/          # TypeScript types
│   └── package.json
│
└── docker-compose.yml       # Docker orchestration
```

## Configuration

### Backend

Create `.env` file from `.env.example` or set environment variables:

```bash
cp backend/.env.example backend/.env
```

**Key settings:**
- `REPOSITORY_ALLOWED_HOSTS` – Comma-separated Git hosts (e.g. `github.com,gitlab.com`). **Empty = allow all hosts** (for private/custom Git servers).
- `MAX_PROJECT_SIZE_GB` – Maximum project size (default: 10GB)
- `CACHE_TTL_DAYS` – Cache retention (default: 7 days)
- `EXTRACTOR_BACKEND` – `auto`, `python`, or `go` (default: auto)

**For private Bitbucket or custom Git servers:**

```bash
# Option 1: Add your host to the allowlist
REPOSITORY_ALLOWED_HOSTS=github.com,gitlab.com,bitbucket.mycompany.com

# Option 2: Allow all hosts (empty value)
REPOSITORY_ALLOWED_HOSTS=
```

Edit `backend/pyproject.toml` for dependencies and settings.

Default ignore patterns:
- `.venv`, `venv` - Virtual environments
- `__pycache__` - Python cache
- `.git` - Git directory
- `node_modules` - Node modules

### Frontend

Edit `frontend/vite.config.ts` for build settings.

The frontend proxies `/api` requests to the backend automatically.

## Extending for New Languages

The architecture uses a **strategy pattern** for language-specific import resolution. JavaScript/TypeScript support is fully implemented. To add a new language:

### 1. Create a Parser

Create a parser in `backend/app/core/parser/`:

```python
# backend/app/core/parser/ruby.py
from pathlib import Path
from app.api.models import ImportInfo

class RubyParser:
    def get_supported_extensions(self) -> list[str]:
        return [".rb"]
    
    def parse_file(self, file_path: Path) -> list[ImportInfo]:
        # Parse Ruby require statements
        # Return list of ImportInfo objects
        ...
```

### 2. Create an Import Resolver

Create a resolver in `backend/app/core/graph/resolvers/`:

```python
# backend/app/core/graph/resolvers/ruby.py
from pathlib import Path
from app.core.graph.resolvers.base import ImportResolver

class RubyImportResolver(ImportResolver):
    def get_supported_extensions(self) -> list[str]:
        return [".rb"]
    
    def resolve_import(self, source_file: str, import_module: str) -> str | None:
        # Resolve Ruby require to actual file path
        # Return absolute path or None if external (gem)
        ...
```

### 3. Register Parser & Resolver

Register in `backend/app/core/parser/factory.py`:

```python
ruby_parser = RubyParser()
for ext in ruby_parser.get_supported_extensions():
    cls._parsers[ext] = ruby_parser
```

Register in `backend/app/core/graph/resolvers/factory.py`:

```python
if ext in [".rb"]:
    return RubyImportResolver(project_root)
```

### 4. Test

Create tests in `backend/tests/test_ruby_resolver.py` and verify resolution works correctly.

**Examples:**
- ✅ **Python**: Relative imports (`.module`), absolute imports, `__init__.py` packages
- ✅ **JavaScript/TypeScript**: Relative (`./`, `../`), path aliases (`@/`, `~/`), index files, tsconfig.json
- ✅ **Go**: Module imports, stdlib detection, internal packages, go.mod parsing

## Performance

- **Parsing**: ~1000 files/second using Python AST + parallel processing
- **Graph Rendering**: Handles 1000+ nodes smoothly
- **Memory**: <100MB for typical projects
- **Caching**: Instant load for previously analyzed projects
- **Speedup**: 5-10x faster with multiprocessing (Phase 3)

## Troubleshooting

### Backend Issues

**Issue**: `Module not found` errors
- Ensure you're using Python 3.11+
- Run `uv sync` to install dependencies

**Issue**: Analysis fails with syntax errors
- Check that the project path is correct
- Files with syntax errors are skipped automatically

### Frontend Issues

**Issue**: Graph not rendering
- Check browser console for errors
- Ensure backend is running on port 8000
- Verify API proxy in `vite.config.ts`

**Issue**: CORS errors
- Backend CORS is configured for localhost:5173
- Check `backend/app/main.py` CORS settings

## Contributing

Contributions are welcome! This is an MVP with room for:
- Additional language parsers
- Performance optimizations
- UI/UX improvements
- Test coverage
- Documentation

## License

MIT

## Acknowledgments

Built with:
- [FastAPI](https://fastapi.tiangolo.com/)
- [React](https://react.dev/)
- [Cytoscape.js](https://js.cytoscape.org/)
- [NetworkX](https://networkx.org/)
- [TailwindCSS](https://tailwindcss.com/)
- [Vite](https://vitejs.dev/)

---

**Made with ❤️ for developers who want to understand their code better**