# Go Import Extractor

Fast dependency extractor for Python, JavaScript, and TypeScript. Used by the Dependency Visualizer backend when `GO_EXTRACTOR_PATH` is set.

## Build

```bash
cd extractor
go build -o extractor .
```

Produces a single binary `extractor`.

## Usage (backend)

1. Build the binary (see above).
2. Set the path in your backend config, e.g. in `.env`:

   ```env
   GO_EXTRACTOR_PATH=/path/to/dependency_visualizer/extractor/extractor
   ```

3. Restart the backend. Analysis will use the Go extractor when the path is set and the binary is executable; otherwise the Python parsers are used.

## Protocol

- **Stdin:** JSON object `{ "files": ["/abs/path/a.py", ...], "project_path": "/abs/project" }`.
- **Stdout:** JSON object `{ "imports": [ { "source_file", "imported_module", "import_type", "line_number" }, ... ], "warnings": ["..."] }`.
- **Exit code:** 0 on success; non-zero on fatal error (response still valid JSON on stdout).

## Supported

- **Python** (`.py`, `.pyi`): `import x`, `import x as y`, `from x import y`, relative `from . import x`.
- **JavaScript/TypeScript** (`.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx`): ES6 `import`, `require()`, dynamic `import()`, `import type ...`.
