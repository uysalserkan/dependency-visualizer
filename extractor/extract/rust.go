package extract

import (
	"regexp"
	"strings"
)

var (
	rustModRegex         = regexp.MustCompile(`mod\s+([a-zA-Z0-9_]+)\s*;`)
	rustUseRegex         = regexp.MustCompile(`use\s+([a-zA-Z0-9_:]+)`)
	rustExternCrateRegex = regexp.MustCompile(`extern\s+crate\s+([a-zA-Z0-9_]+)\s*;`)
)

// IsRustFile checks if a file is a Rust file based on extension.
func IsRustFile(path string) bool {
	return strings.HasSuffix(strings.ToLower(path), ".rs")
}

// ExtractRust extracts modules from a Rust source file.
func ExtractRust(content string, filePath string) []Import {
	var imports []Import
	lines := strings.Split(content, "\n")

	patterns := map[*regexp.Regexp]string{
		rustModRegex:         "mod",
		rustUseRegex:         "use",
		rustExternCrateRegex: "extern_crate",
	}

	for i, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "//") {
			continue
		}

		for re, importType := range patterns {
			matches := re.FindAllStringSubmatch(line, -1)
			for _, match := range matches {
				if len(match) > 1 {
					imports = append(imports, Import{
						SourceFile:     filePath,
						ImportedModule: match[1],
						ImportType:     importType,
						LineNumber:     i + 1,
					})
				}
			}
		}
	}
	return imports
}