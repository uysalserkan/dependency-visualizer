import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, List, FileCode, Package, Globe } from 'lucide-react'
import { useGraphStore } from '@/stores/graphStore'
import { cn } from '@/lib/utils'
import type { Node } from '@/types/api'

type SortKey = 'label' | 'node_type' | 'import_count' | 'imported_by_count' | 'pagerank'
type SortDir = 'asc' | 'desc'

function NodeListView() {
  const analysis = useGraphStore((s) => s.analysis)
  const selectedNode = useGraphStore((s) => s.selectedNode)
  const setSelectedNode = useGraphStore((s) => s.setSelectedNode)
  const searchQuery = useGraphStore((s) => s.searchQuery)
  const showStdlibNodes = useGraphStore((s) => s.showStdlibNodes)
  const showExternalPackages = useGraphStore((s) => s.showExternalPackages)

  const [sortKey, setSortKey] = useState<SortKey>('label')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const filteredAndSortedNodes = useMemo(() => {
    if (!analysis?.nodes) return []
    let list = analysis.nodes.filter((n) => {
      if (n.node_type !== 'external') return true
      const kind = n.external_kind ?? 'package'
      return (kind === 'stdlib' && showStdlibNodes) || (kind === 'package' && showExternalPackages)
    })
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (n) =>
          n.label.toLowerCase().includes(q) || n.file_path.toLowerCase().includes(q)
      )
    }
    list = [...list].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'label':
          cmp = a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })
          break
        case 'node_type':
          cmp = a.node_type.localeCompare(b.node_type) || a.label.localeCompare(b.label)
          break
        case 'import_count':
          cmp = a.import_count - b.import_count || a.label.localeCompare(b.label)
          break
        case 'imported_by_count':
          cmp = a.imported_by_count - b.imported_by_count || a.label.localeCompare(b.label)
          break
        case 'pagerank':
          cmp = a.pagerank - b.pagerank || a.label.localeCompare(b.label)
          break
        default:
          cmp = a.label.localeCompare(b.label)
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [analysis?.nodes, searchQuery, showStdlibNodes, showExternalPackages, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const TypeIcon = ({ node }: { node: Node }) => {
    if (node.node_type === 'external') {
      return node.external_kind === 'stdlib' ? (
        <Globe className="w-3.5 h-3.5 text-slate-500" aria-hidden />
      ) : (
        <Package className="w-3.5 h-3.5 text-amber-500" aria-hidden />
      )
    }
    return <FileCode className="w-3.5 h-3.5 text-indigo-500" aria-hidden />
  }

  if (!analysis) return null

  return (
    <div className="h-full flex flex-col rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden bg-white/80 dark:bg-slate-900/50">
      <div className="shrink-0 px-4 py-3 border-b border-gray-200 dark:border-white/5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <List className="w-4 h-4 text-gray-500 dark:text-slate-400" aria-hidden />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Nodes</h2>
        </div>
        <span className="text-xs text-gray-500 dark:text-slate-400 font-mono">
          {filteredAndSortedNodes.length} of {analysis.nodes.length}
        </span>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-gray-50 dark:bg-slate-800/80 border-b border-gray-200 dark:border-white/5 z-10">
            <tr>
              <th className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                <button
                  type="button"
                  onClick={() => toggleSort('label')}
                  className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
                >
                  Label
                  {sortKey === 'label' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                </button>
              </th>
              <th className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-20">
                Type
              </th>
              <th className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-24">
                <button
                  type="button"
                  onClick={() => toggleSort('import_count')}
                  className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
                >
                  Imports
                  {sortKey === 'import_count' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                </button>
              </th>
              <th className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-24">
                <button
                  type="button"
                  onClick={() => toggleSort('imported_by_count')}
                  className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
                >
                  Imported by
                  {sortKey === 'imported_by_count' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                </button>
              </th>
              <th className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-20">
                <button
                  type="button"
                  onClick={() => toggleSort('pagerank')}
                  className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-white"
                >
                  Rank
                  {sortKey === 'pagerank' && (sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200/80 dark:divide-white/5">
            {filteredAndSortedNodes.map((node) => {
              const isSelected = selectedNode?.id === node.id
              return (
                <tr
                  key={node.id}
                  onClick={() => setSelectedNode(isSelected ? null : node)}
                  className={cn(
                    'cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-100'
                      : 'hover:bg-gray-50 dark:hover:bg-white/5'
                  )}
                >
                  <td className="px-3 py-2 font-mono text-xs text-gray-900 dark:text-white truncate max-w-[200px]" title={node.file_path || node.label}>
                    {node.label}
                  </td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-1.5">
                      <TypeIcon node={node} />
                      <span className="text-xs capitalize text-gray-600 dark:text-slate-400">
                        {node.node_type}
                        {node.external_kind ? ` (${node.external_kind})` : ''}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-600 dark:text-slate-400 tabular-nums">
                    {node.import_count}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-600 dark:text-slate-400 tabular-nums">
                    {node.imported_by_count}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-600 dark:text-slate-400 tabular-nums">
                    {node.pagerank.toFixed(3)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filteredAndSortedNodes.length === 0 && (
          <div className="p-8 text-center text-sm text-gray-500 dark:text-slate-400">
            No nodes match the current filters or search.
          </div>
        )}
      </div>
    </div>
  )
}

export { NodeListView }
