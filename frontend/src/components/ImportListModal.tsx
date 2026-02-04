import { useMemo, useEffect } from 'react'
import { X, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import type { Node, Edge, AnalysisResult } from '@/types/api'

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

export type ImportListVariant = 'outgoing' | 'incoming'

interface ImportListModalProps {
  variant: ImportListVariant
  analysis: AnalysisResult
  selectedNode: Node
  onClose: () => void
  onSelectNode: (node: Node) => void
}

export function ImportListModal({
  variant,
  analysis,
  selectedNode,
  onClose,
  onSelectNode,
}: ImportListModalProps) {
  const list = useMemo(() => {
    const items: { node: Node; edge: Edge }[] = []
    analysis.edges.forEach((edge) => {
      if (variant === 'outgoing' && edge.source === selectedNode.id) {
        const node = analysis.nodes.find((n) => n.id === edge.target)
        if (node) items.push({ node, edge })
      }
      if (variant === 'incoming' && edge.target === selectedNode.id) {
        const node = analysis.nodes.find((n) => n.id === edge.source)
        if (node) items.push({ node, edge })
      }
    })
    return items
  }, [analysis, selectedNode.id, variant])

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
  const isOutgoing = variant === 'outgoing'
  const title = isOutgoing ? 'This file imports' : 'Imports this file'
  const emptyMessage = isOutgoing
    ? 'No imports — this file does not import any other modules.'
    : 'Nothing imports this file — no other module imports this one.'
  const Icon = isOutgoing ? ArrowUpRight : ArrowDownLeft

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-list-title"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                isOutgoing ? 'bg-indigo-500/20' : 'bg-violet-500/20'
              }`}
            >
              <Icon className={`w-5 h-5 ${isOutgoing ? 'text-indigo-500' : 'text-violet-500'}`} aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 id="import-list-title" className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                {title}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 truncate" title={selectedNode.file_path}>
                {displayLabel} · {list.length} file{list.length !== 1 ? 's' : ''}
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
          {list.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-4 px-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              {emptyMessage}
            </p>
          ) : (
            <ul className="space-y-1">
              {list.map(({ node, edge }) => {
                const badge = typeBadge(node)
                const label = node.label || (node.file_path.split(/[/\\]/).pop() ?? node.file_path)
                const hoverRing = isOutgoing ? 'focus:ring-indigo-500 hover:border-indigo-500/30 hover:bg-indigo-500/10' : 'focus:ring-violet-500 hover:border-violet-500/30 hover:bg-violet-500/10'
                const iconColor = isOutgoing ? 'text-indigo-500' : 'text-violet-500'
                return (
                  <li key={node.id}>
                    <button
                      type="button"
                      onClick={() => handleRowClick(node)}
                      className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-xl text-left border border-transparent ${hoverRing} dark:hover:bg-opacity-10 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900`}
                    >
                      <span className={`${iconColor} shrink-0`} aria-hidden>
                        <Icon className="w-4 h-4" />
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
        </div>
      </div>
    </div>
  )
}
