package extract

import (
	"regexp"
	"strings"
)

var (
	rubyRequireRegex         = regexp.MustCompile(`require\s*\(?\s*['"]([^'"]+)['"]`)
	rubyRequireRelativeRegex = regexp.MustCompile(`require_relative\s*\(?\s*['"]([^'"]+)['"]`)
	rubyLoadRegex            = regexp.MustCompile(`load\s*\(?\s*['"]([^'"]+)['"]`)
)

// IsRubyFile checks if a file is a Ruby file based on extension.
func IsRubyFile(path string) bool {
	return strings.HasSuffix(strings.ToLower(path), ".rb")
}

// ExtractRuby extracts imports from a Ruby source file.
func ExtractRuby(content string, filePath string) []Import {
	var imports []Import
	lines := strings.Split(content, "\n")

	patterns := map[*regexp.Regexp]string{
		rubyRequireRegex:         "require",
		rubyRequireRelativeRegex: "require_relative",
		rubyLoadRegex:            "load",
	}

	for i, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "#") {
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