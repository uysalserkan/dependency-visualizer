package extract

import (
	"path/filepath"
	"regexp"
	"strings"
)

var (
	cppLocalIncludeRegex  = regexp.MustCompile(`#\s*include\s*"([^"]+)"`)
	cppSystemIncludeRegex = regexp.MustCompile(`#\s*include\s*<([^>]+)>`)
	cppExtensions         = []string{".c", ".h", ".cpp", ".hpp", ".cc", ".hh", ".cxx"}
)

// IsCppFile checks if a file is a C/C++ file based on extension.
func IsCppFile(path string) bool {
	ext := strings.ToLower(filepath.Ext(path))
	for _, e := range cppExtensions {
		if ext == e {
			return true
		}
	}
	return false
}

// ExtractCpp extracts includes from a C/C++ source file.
func ExtractCpp(content string, filePath string) []Import {
	var imports []Import
	lines := strings.Split(content, "\n")

	patterns := map[*regexp.Regexp]string{
		cppLocalIncludeRegex:  "local",
		cppSystemIncludeRegex: "system",
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