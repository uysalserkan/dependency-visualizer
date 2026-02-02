package extract

// Import represents a single import statement (matches Python API model).
type Import struct {
	SourceFile     string `json:"source_file"`
	ImportedModule string `json:"imported_module"`
	ImportType     string `json:"import_type"` // "module" or "from"
	LineNumber     int    `json:"line_number"`
}
