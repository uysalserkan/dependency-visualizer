package extract

import (
	"path/filepath"
	"regexp"
	"strings"
)

// Python extensions we support.
var pythonExts = map[string]bool{
	".py":  true,
	".pyi": true,
}

// IsPythonFile reports whether the path has a Python extension.
func IsPythonFile(path string) bool {
	return pythonExts[strings.ToLower(filepath.Ext(path))]
}

// Python import patterns (line-based; sufficient for dependency extraction).
var (
	// import foo[, bar] or import foo as x
	rePythonImport = regexp.MustCompile(`^\s*import\s+(.+)$`)
	// from foo import ... or from . import ...
	rePythonFrom = regexp.MustCompile(`^\s*from\s+(\.*[a-zA-Z0-9_.]*)\s+import\s+`)
)

// ExtractPython parses content and returns imports (sourcePath = path of the file).
func ExtractPython(content string, sourcePath string) []Import {
	var out []Import
	lines := strings.Split(content, "\n")
	for i, line := range lines {
		lineNum := i + 1
		trimmed := strings.TrimSpace(line)
		// Skip comments and empty lines
		if trimmed == "" || strings.HasPrefix(trimmed, "#") {
			continue
		}
		// Wrap in multiline check: skip if inside triple-quoted string (simplified: skip continuation)
		if strings.HasSuffix(trimmed, "\\") {
			continue
		}
		// import ...
		if m := rePythonImport.FindStringSubmatch(trimmed); len(m) > 0 {
			// Split by comma for "import a, b, c"
			rest := strings.TrimSpace(m[1])
			for _, part := range splitImportList(rest) {
				name := strings.TrimSpace(part)
				if idx := strings.Index(name, " as "); idx > 0 {
					name = strings.TrimSpace(name[:idx])
				}
				if name != "" {
					out = append(out, Import{
						SourceFile:      sourcePath,
						ImportedModule:  name,
						ImportType:      "module",
						LineNumber:      lineNum,
					})
				}
			}
			continue
		}
		// from ... import ...
		if m := rePythonFrom.FindStringSubmatch(trimmed); len(m) > 0 {
			module := strings.TrimSpace(m[1])
			if module != "" {
				out = append(out, Import{
					SourceFile:     sourcePath,
					ImportedModule: module,
					ImportType:    "from",
					LineNumber:    lineNum,
				})
			}
		}
	}
	return out
}

// splitImportList splits "a, b, c" respecting nested parens.
func splitImportList(s string) []string {
	var parts []string
	var cur strings.Builder
	depth := 0
	for _, r := range s {
		switch r {
		case '(':
			depth++
			cur.WriteRune(r)
		case ')':
			depth--
			cur.WriteRune(r)
		case ',':
			if depth == 0 {
				parts = append(parts, cur.String())
				cur.Reset()
			} else {
				cur.WriteRune(r)
			}
		default:
			cur.WriteRune(r)
		}
	}
	if cur.Len() > 0 {
		parts = append(parts, cur.String())
	}
	return parts
}
