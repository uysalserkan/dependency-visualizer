import { useMemo, useEffect } from 'react'
import { X, FileCode, Box } from 'lucide-react'
import type { Node, AnalysisResult } from '@/types/api'
import { getFolderSubgraph } from '@/lib/folderMetrics'

interface EntryPointsModalProps {
  analysis: AnalysisResult
  /** When set, only entry points within this folder are shown. */
  selectedFolderPath: string | null
  onClose: () => void
  onSelectNode: (node: Node) => void
}

export function EntryPointsModal({
  analysis,
  selectedFolderPath,
  onClose,
  onSelectNode,
}: EntryPointsModalProps) {
  const entryPoints = useMemo(() => {
    if (selectedFolderPath) {
      const { internalNodes, internalEdges } = getFolderSubgraph(analysis, selectedFolderPath)
      const hasIncoming = new Set(internalEdges.map((e) => e.target))
      return internalNodes.filter((n) => !hasIncoming.has(n.id))
    }
    return analysis.nodes.filter(
      (n) => n.node_type !== 'external' && (n.imported_by_count ?? 0) === 0
    )
  }, [analysis, selectedFolderPath])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleRowClick = (node: Node) => {
    onSelectNode(node)
    onClose()
  }

  const scopeLabel = selectedFolderPath
    ? `Folder: ${selectedFolderPath.split(/[/\\]/).filter(Boolean).pop() ?? selectedFolderPath}`
    : 'Project'

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="entry-points-title"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Box className="w-5 h-5 text-emerald-500" aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 id="entry-points-title" className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                Entry Points
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 truncate" title={scopeLabel}>
                {scopeLabel} · {entryPoints.length} file{entryPoints.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {entryPoints.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-4 px-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              No entry points in this scope. Entry points are internal files that nothing else imports.
            </p>
          ) : (
            <ul className="space-y-1">
              {entryPoints.map((node) => {
                const label = node.label || (node.file_path.split(/[/\\]/).pop() ?? node.file_path)
                return (
                  <li key={node.id}>
                    <button
                      type="button"
                      onClick={() => handleRowClick(node)}
                      className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl text-left border border-transparent hover:border-emerald-500/30 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/10 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                    >
                      <FileCode className="w-4 h-4 text-emerald-500 shrink-0" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {label}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate font-mono">
                          {node.file_path}
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
