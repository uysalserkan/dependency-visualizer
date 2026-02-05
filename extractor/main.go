// Command extractor reads a JSON request from stdin and writes extracted
// imports (and optional warnings) as JSON to stdout. Used by the Python backend
// for fast dependency extraction.
package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"dependency_visualizer/extractor/extract"
)

type Request struct {
	Files        []string `json:"files"`
	ProjectPath  string   `json:"project_path"`
}

type Response struct {
	Imports  []extract.Import `json:"imports"`
	Warnings []string          `json:"warnings"`
}

func main() {
	dec := json.NewDecoder(bufio.NewReader(os.Stdin))
	var req Request
	if err := dec.Decode(&req); err != nil {
		writeResponse(Response{Warnings: []string{"invalid request: " + err.Error()}})
		os.Exit(1)
	}

	resp := run(req)
	writeResponse(resp)
}

func writeResponse(resp Response) {
	out, err := json.Marshal(resp)
	if err != nil {
		out, _ = json.Marshal(Response{Warnings: []string{"encode: " + err.Error()}})
	}
	fmt.Println(string(out))
}

func run(req Request) Response {
	var imports []extract.Import
	var warnings []string
	projectPath := req.ProjectPath
	if projectPath == "" {
		projectPath = "."
	}

	for _, f := range req.Files {
		ext := strings.ToLower(filepath.Ext(f))
		content, err := os.ReadFile(f)
		if err != nil {
			warnings = append(warnings, relPath(projectPath, f)+": "+err.Error())
			continue
		}
		src := string(content)
		switch {
		case extract.IsPythonFile(f):
			imports = append(imports, extract.ExtractPython(src, f)...)
		case extract.IsJavaScriptFile(f):
			imports = append(imports, extract.ExtractJavaScript(src, f)...)
		default:
			// Unsupported extension; only warn if file looks non-empty
			if len(strings.TrimSpace(src)) > 0 {
				warnings = append(warnings, relPath(projectPath, f)+": unsupported extension "+ext)
			}
		}
	}

	return Response{Imports: imports, Warnings: warnings}
}

func relPath(project, abs string) string {
	if project == "" || project == "." {
		return abs
	}
	rel, err := filepath.Rel(project, abs)
	if err != nil {
		return abs
	}
	return rel
}
