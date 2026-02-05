import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { X, Code, FileCode } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

/** Infer Prism language from file extension */
function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    py: 'python',
    js: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    json: 'json',
    css: 'css',
    scss: 'scss',
    html: 'html',
    md: 'markdown',
    sh: 'bash',
    bash: 'bash',
    yaml: 'yaml',
    yml: 'yaml',
    go: 'go',
    java: 'java',
    rb: 'ruby',
    c: 'c',
    h: 'c',
    cpp: 'cpp',
    hpp: 'cpp',
    cc: 'cpp',
    hh: 'cpp',
    cxx: 'cpp',
    rs: 'rust',
  }
  return map[ext] ?? 'text'
}

interface FilePreviewModalProps {
  analysisId: string
  filePath: string
  projectPath?: string  // To detect if it's an online repository
  onClose: () => void
}

export function FilePreviewModal({ analysisId, filePath, projectPath, onClose }: FilePreviewModalProps) {
  const { data: preview, isLoading, error } = useQuery({
    queryKey: ['file-preview', analysisId, filePath],
    queryFn: () => api.getFilePreview(analysisId, filePath),
  })

  // Check if this is an online repository analysis (URL-based)
  const isOnlineRepository = projectPath?.startsWith('http://') || projectPath?.startsWith('https://')
  
  // For online repos, show only filename; for local, show full path
  const displayPath = isOnlineRepository ? filePath.split('/').pop() || filePath : filePath

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="file-preview-title">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-600">
          <div className="flex items-center gap-2 min-w-0">
            <FileCode className="w-5 h-5 shrink-0 text-primary" />
            <h2 id="file-preview-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">File Preview</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-slate-600">Loading...</div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-red-600">Failed to load file: {(error as Error).message}</div>
            </div>
          )}

          {preview && (
            <div className="space-y-4">
              {/* File Info */}
              <div className="bg-slate-50 dark:bg-slate-700/50 rounded p-3 space-y-1">
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100 break-all">
                  {displayPath}
                </div>
                <div className="flex gap-4 text-xs text-slate-600 dark:text-slate-400">
                  <span>{preview.line_count} lines</span>
                  <span>{(preview.size_bytes / 1024).toFixed(1)} KB</span>
                  <span>{preview.imports.length} imports</span>
                </div>
              </div>

              {/* Imports */}
              {preview.imports.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Imports</h3>
                  <div className="bg-slate-50 dark:bg-slate-700/50 rounded p-3 space-y-1 max-h-40 overflow-y-auto">
                    {preview.imports.map((imp, i) => (
                      <div key={i} className="text-xs font-mono text-slate-700 dark:text-slate-300">
                        <span className="text-primary">Line {imp.line_number}:</span>{' '}
                        {imp.import_type === 'from' ? 'from ' : 'import '}
                        <span className="font-semibold">{imp.imported_module}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Code Content */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Content</h3>
                </div>
                <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 [&>pre]:!my-0 [&>pre]:!rounded-lg [&>pre]:!text-xs [&>pre]:!p-4">
                  <SyntaxHighlighter
                    language={getLanguageFromPath(preview.file_path)}
                    style={oneDark}
                    showLineNumbers
                    wrapLongLines
                    customStyle={{ margin: 0, background: 'rgb(15 23 42)' }}
                    codeTagProps={{ style: { fontSize: '0.75rem' } }}
                  >
                    {preview.content}
                  </SyntaxHighlighter>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
