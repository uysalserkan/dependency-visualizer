package extract

import (
	"path/filepath"
	"regexp"
	"strings"
)

var jsExts = map[string]bool{
	".js": true, ".jsx": true, ".mjs": true, ".cjs": true,
	".ts": true, ".tsx": true,
}

func IsJavaScriptFile(path string) bool {
	return jsExts[strings.ToLower(filepath.Ext(path))]
}

// ES6: import x from "m", import * as x from "m", import { a } from "m", import "m"
// CommonJS: require("m")
// Dynamic: import("m")
// TypeScript: import type { T } from "m"
var (
	reES6ImportFrom  = regexp.MustCompile(`import\s+(?:\w+\s+from|\*\s+as\s+\w+\s+from|\{[^}]*\}\s*from|\w+\s*,\s*\{[^}]*\}\s+from)\s+['"]([^'"]+)['"]`)
	reES6ImportSide  = regexp.MustCompile(`import\s+['"]([^'"]+)['"]`)
	reRequire        = regexp.MustCompile(`require\s*\(\s*['"]([^'"]+)['"]\s*\)`)
	reDynamicImport  = regexp.MustCompile(`import\s*\(\s*['"]([^'"]+)['"]\s*\)`)
	reTypeImportFrom = regexp.MustCompile(`import\s+type\s+\{[^}]*\}\s+from\s+['"]([^'"]+)['"]`)
)

func ExtractJavaScript(content string, sourcePath string) []Import {
	var out []Import
	lines := strings.Split(content, "\n")
	for i, line := range lines {
		lineNum := i + 1
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "//") || strings.HasPrefix(trimmed, "/*") {
			continue
		}
		// ES6 import ... from "module"
		for _, re := range []*regexp.Regexp{reES6ImportFrom, reES6ImportSide} {
			for _, m := range re.FindAllStringSubmatch(line, -1) {
				if len(m) > 1 && m[1] != "" {
					out = append(out, Import{
						SourceFile:     sourcePath,
						ImportedModule: m[1],
						ImportType:    "module",
						LineNumber:    lineNum,
					})
				}
			}
		}
		// require("module")
		for _, m := range reRequire.FindAllStringSubmatch(line, -1) {
			if len(m) > 1 && m[1] != "" {
				out = append(out, Import{
					SourceFile:     sourcePath,
					ImportedModule: m[1],
					ImportType:     "from",
					LineNumber:     lineNum,
				})
			}
		}
		// import("module")
		for _, m := range reDynamicImport.FindAllStringSubmatch(line, -1) {
			if len(m) > 1 && m[1] != "" {
				out = append(out, Import{
					SourceFile:     sourcePath,
					ImportedModule: m[1],
					ImportType:     "module",
					LineNumber:     lineNum,
				})
			}
		}
		// import type { ... } from "module"
		for _, m := range reTypeImportFrom.FindAllStringSubmatch(line, -1) {
			if len(m) > 1 && m[1] != "" {
				out = append(out, Import{
					SourceFile:     sourcePath,
					ImportedModule: m[1],
					ImportType:     "from",
					LineNumber:     lineNum,
				})
			}
		}
	}
	return out
}
