import { useMemo, useEffect, useRef } from 'react'
import { X, ArrowUpRight, ArrowDownLeft, FileCode } from 'lucide-react'
import type { Node, Edge, AnalysisResult } from '@/types/api'

interface ImportRelationsModalProps {
  analysis: AnalysisResult
  selectedNode: Node
  onClose: () => void
  onSelectNode: (node: Node) => void
}

function typeBadge(node: Node): { label: string; className: string } {
  if (node.node_type === 'external') {
    const kind = node.external_kind === 'stdlib' ? 'Stdlib' : 'Package'
    return { label: kind, className: 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300' }
  }
  if (node.node_type === 'package') {
    return { label: 'Package', className: 'bg-violet-500/15 border-violet-500/30 text-violet-700 dark:text-violet-300' }
  }
  return { label: 'Internal', className: 'bg-slate-500/15 border-slate-500/30 text-slate-700 dark:text-slate-300' }
}

function LineNumbersBadge({ lineNumbers }: { lineNumbers: number[] }) {
  const lines = lineNumbers.slice(0, 5)
  const more = lineNumbers.length > 5 ? lineNumbers.length - 5 : 0
  return (
    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-white/10 shrink-0">
      {lines.map((n) => `L${n}`).join(', ')}
      {more > 0 && ` +${more}`}
    </span>
  )
}

export function ImportRelationsModal({
  analysis,
  selectedNode,
  onClose,
  onSelectNode,
}: ImportRelationsModalProps) {
  const { outgoing, incoming } = useMemo(() => {
    const out: { node: Node; edge: Edge }[] = []
    const inc: { node: Node; edge: Edge }[] = []
    analysis.edges.forEach((edge) => {
      if (edge.source === selectedNode.id) {
        const node = analysis.nodes.find((n) => n.id === edge.target)
        if (node) out.push({ node, edge })
      }
      if (edge.target === selectedNode.id) {
        const node = analysis.nodes.find((n) => n.id === edge.source)
        if (node) inc.push({ node, edge })
      }
    })
    return { outgoing: out, incoming: inc }
  }, [analysis, selectedNode.id])

  const containerRef = useRef<HTMLDivElement>(null)

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

  const displayLabel = selectedNode.label || (selectedNode.file_path.split(/[/\\]/).pop() ?? selectedNode.file_path)

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-relations-title"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
              <FileCode className="w-5 h-5 text-indigo-500" aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 id="import-relations-title" className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                Imports &amp; Imported by
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 truncate" title={selectedNode.file_path}>
                {displayLabel}
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

        {/* Body: two sections */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* This file imports (outgoing) */}
          <section aria-labelledby="outgoing-heading">
            <div
              id="outgoing-heading"
              className="flex items-center gap-2 mb-3 text-sm font-semibold text-indigo-600 dark:text-indigo-400"
            >
              <ArrowUpRight className="w-4 h-4 shrink-0" aria-hidden />
              This file imports ({outgoing.length})
            </div>
            {outgoing.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-3 px-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                No imports — this file does not import any other modules.
              </p>
            ) : (
              <ul className="space-y-1">
                {outgoing.map(({ node, edge }) => {
                  const badge = typeBadge(node)
                  const label = node.label || (node.file_path.split(/[/\\]/).pop() ?? node.file_path)
                  return (
                    <li key={node.id}>
                      <button
                        type="button"
                        onClick={() => handleRowClick(node)}
                        className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl text-left border border-transparent hover:border-indigo-500/30 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                      >
                        <span className="text-indigo-500 shrink-0" aria-hidden>
                          <ArrowUpRight className="w-4 h-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {label}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate font-mono">
                            {node.file_path}
                          </div>
                        </div>
                        {edge.line_numbers?.length > 0 && (
                          <LineNumbersBadge lineNumbers={edge.line_numbers} />
                        )}
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded border shrink-0 ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                        {node.node_type === 'external' && node.version && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-600 shrink-0" title="Installed version">
                            v{node.version}
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* Imports this file (incoming) */}
          <section aria-labelledby="incoming-heading">
            <div
              id="incoming-heading"
              className="flex items-center gap-2 mb-3 text-sm font-semibold text-violet-600 dark:text-violet-400"
            >
              <ArrowDownLeft className="w-4 h-4 shrink-0" aria-hidden />
              Imports this file ({incoming.length})
            </div>
            {incoming.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-3 px-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                Nothing imports this file — no other module imports this one.
              </p>
            ) : (
              <ul className="space-y-1">
                {incoming.map(({ node, edge }) => {
                  const badge = typeBadge(node)
                  const label = node.label || (node.file_path.split(/[/\\]/).pop() ?? node.file_path)
                  return (
                    <li key={node.id}>
                      <button
                        type="button"
                        onClick={() => handleRowClick(node)}
                        className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl text-left border border-transparent hover:border-violet-500/30 hover:bg-violet-500/10 dark:hover:bg-violet-500/10 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                      >
                        <span className="text-violet-500 shrink-0" aria-hidden>
                          <ArrowDownLeft className="w-4 h-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {label}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate font-mono">
                            {node.file_path}
                          </div>
                        </div>
                        {edge.line_numbers?.length > 0 && (
                          <LineNumbersBadge lineNumbers={edge.line_numbers} />
                        )}
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded border shrink-0 ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                        {node.node_type === 'external' && node.version && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-600 shrink-0" title="Installed version">
                            v{node.version}
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
