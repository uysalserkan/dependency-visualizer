import { useState } from 'react';
import { Code, FileCode, X, ChevronRight, ChevronDown, Circle } from 'lucide-react';

interface CodePreviewProps {
  filePath: string | null;
  onClose: () => void;
}

export function CodePreview({ filePath, onClose }: CodePreviewProps) {
  const [preview, setPreview] = useState<{
    file_path: string;
    start_line: number;
    end_line: number;
    lines: string[];
    language: string;
    total_lines: number;
  } | null>(null);
  
  const [imports, setImports] = useState<Array<{
    line_number: number;
    line_content: string;
    import_type: string;
    imported_names: string[];
  }>>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showImports, setShowImports] = useState(true);

  const loadPreview = async () => {
    if (!filePath) return;

    setLoading(true);
    setError(null);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      // Load file preview
      const previewRes = await fetch(
        `${API_URL}/api/preview/file?` +
        new URLSearchParams({
          file_path: filePath,
          start_line: '1',
          context_lines: '0',
        })
      );

      if (!previewRes.ok) {
        throw new Error('Failed to load file preview');
      }

      const previewData = await previewRes.json();
      setPreview(previewData);

      // Load imports
      const importsRes = await fetch(
        `${API_URL}/api/preview/imports?` +
        new URLSearchParams({ file_path: filePath })
      );

      if (importsRes.ok) {
        const importsData = await importsRes.json();
        setImports(importsData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load preview');
    } finally {
      setLoading(false);
    }
  };

  // Load preview when filePath changes
  useState(() => {
    if (filePath) {
      loadPreview();
    }
  });

  if (!filePath) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <FileCode className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Select a node to view code</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Code className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <h3 className="font-medium text-sm truncate" title={filePath}>
            {filePath.split('/').pop()}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
         aria-label="Close">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading && (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            Loading…
          </div>
        )}

        {error && (
          <div className="p-4 text-center text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {preview && (
          <div className="p-4 space-y-4">
            {/* File Info */}
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <div className="truncate" title={preview.file_path}>
                <span className="font-medium">Path:</span> {preview.file_path}
              </div>
              <div>
                <span className="font-medium">Language:</span> {preview.language}
              </div>
              <div>
                <span className="font-medium">Total Lines:</span> {preview.total_lines}
              </div>
            </div>

            {/* Imports Section */}
            {imports.length > 0 && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => setShowImports(!showImports)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {showImports ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium">
                      Imports ({imports.length})
                    </span>
                  </div>
                </button>

                {showImports && (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-60 overflow-y-auto">
                    {imports.map((imp, idx) => (
                      <div key={idx} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-900">
                        <div className="flex items-start gap-2">
                          <Circle className="w-3 h-3 mt-1 flex-shrink-0 text-blue-500" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-mono text-gray-900 dark:text-gray-100 break-all mb-1">
                              {imp.line_content}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                                Line {imp.line_number}
                              </span>
                              <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                                {imp.import_type}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Code Lines */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-900 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Source Code
                </span>
              </div>
              <div className="bg-gray-900 dark:bg-black overflow-x-auto">
                <pre className="text-xs p-4">
                  {preview.lines.map((line, idx) => {
                    const lineNumber = preview.start_line + idx;
                    const isImportLine = imports.some(imp => imp.line_number === lineNumber);
                    
                    return (
                      <div
                        key={idx}
                        className={`flex ${isImportLine ? 'bg-blue-900/20' : ''}`}
                      >
                        <span className="text-gray-500 dark:text-gray-600 select-none w-12 flex-shrink-0 text-right pr-4">
                          {lineNumber}
                        </span>
                        <code className="text-gray-100 dark:text-gray-300 flex-1">
                          {line || ' '}
                        </code>
                      </div>
                    );
                  })}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
