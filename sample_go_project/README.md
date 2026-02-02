# Sample Go Project - REST API

A sample Go web API project demonstrating Import Visualizer's Go support.

## Structure

```
sample_go_project/
├── go.mod                  # Module definition
├── cmd/
│   └── server/
│       └── main.go         # Application entry point
├── internal/
│   ├── api/
│   │   └── handlers.go     # HTTP handlers
│   └── database/
│       └── database.go     # Database layer
└── pkg/
    └── utils/
        └── http.go         # HTTP utilities
```

## Dependencies

### Internal Packages
- `internal/api` - HTTP handlers and routing
- `internal/database` - Database operations
- `pkg/utils` - Shared utilities

### External Packages (Third-party)
- `github.com/gorilla/mux` - HTTP router
- `github.com/lib/pq` - PostgreSQL driver

### Standard Library
- `fmt`, `log`, `net/http` - Core Go packages
- `encoding/json` - JSON encoding
- `database/sql` - SQL interface

## Import Graph Features Demonstrated

✅ **Go Module Support** - `go.mod` parsing for module path  
✅ **Internal Imports** - `github.com/example/sample-api/internal/api`  
✅ **Standard Library** - `fmt`, `net/http`, etc. (shown as external)  
✅ **Third-party Packages** - `github.com/gorilla/mux` (external)  
✅ **Blank Imports** - `_ "github.com/lib/pq"` (driver registration)  
✅ **Package Organization** - `internal/`, `pkg/`, `cmd/` structure

## Try It

Analyze with Import Visualizer:

```bash
# Via UI
Path: /Users/serkan.uysal/Documents/import_visualizer/sample_go_project

# Via API
curl -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"project_path": "/path/to/sample_go_project"}'
```

## Expected Graph

**Nodes:**
- `main.go` (entry point)
- `handlers.go` (API layer)
- `database.go` (data layer)
- `http.go` (utilities)
- External: `gorilla/mux`, `lib/pq`, `fmt`, `net/http`, etc.

**Edges:**
- `main.go` → `api`, `database`, `utils`, `mux`
- `handlers.go` → `database`, `utils`, `mux`
- `database.go` → `lib/pq`, `sql`
- `http.go` → `json`, `http`, `os`

## Features Highlighted

1. **Go Modules** - Modern Go dependency management
2. **Project Layout** - Standard Go project structure (cmd, internal, pkg)
3. **Import Resolution** - Internal vs external package detection
4. **Stdlib Detection** - Go standard library packages marked as external
5. **Dependency Graph** - Clear visualization of package dependencies
