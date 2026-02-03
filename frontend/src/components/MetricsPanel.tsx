import { useState, useMemo } from 'react'
import { AlertCircle, Package, FileCode, Layers, TrendingUp, Eye, ArrowDownCircle, ArrowUpCircle, Network, Box, Copy, Check, Zap, ExternalLink, Folder } from 'lucide-react'
import { useGraphStore } from '@/stores/graphStore'
import { computeFolderMetrics } from '@/lib/folderMetrics'
import { FilePreviewModal } from './FilePreviewModal'
import { ExternalPackagesModal } from './ExternalPackagesModal'
import type { Node, GraphMetrics, CycleDetail } from '@/types/api'
import type { FolderMetrics } from '@/lib/folderMetrics'

// --- Module Details: role badges derived from node metrics
function getModuleRoles(node: Node): string[] {
  const roles: string[] = []
  if ((node.imported_by_count ?? 0) === 0 && node.node_type !== 'external') roles.push('Entry point')
  if ((node.import_count ?? 0) === 0 && node.node_type !== 'external') roles.push('Leaf')
  if ((node.cycle_count ?? 0) > 0) roles.push('In cycles')
  if ((node.imported_by_count ?? 0) >= 5) roles.push('Hub')
  return roles
}

function getTypeStyle(nodeType: string): { bg: string; border: string; text: string; label: string } {
  switch (nodeType) {
    case 'package': return { bg: 'bg-violet-500/15', border: 'border-violet-500/30', text: 'text-violet-600 dark:text-violet-400', label: 'Package' }
    case 'external': return { bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-600 dark:text-amber-400', label: 'External' }
    default: return { bg: 'bg-indigo-500/15', border: 'border-indigo-500/30', text: 'text-indigo-600 dark:text-indigo-400', label: 'Module' }
  }
}

// Human-readable impact description from node metrics
function getImpactText(node: Node): string | null {
  if (node.node_type === 'external') return null
  const in_ = node.imported_by_count ?? 0
  const out = node.import_count ?? 0
  const cycles = node.cycle_count ?? 0
  const pr = node.pagerank ?? 0
  const bet = node.betweenness ?? 0
  if (out === 0 && in_ === 0) return 'Isolated — no imports or dependents.'
  if (out === 0) return 'Leaf — no outgoing imports.'
  if (in_ === 0) return 'Entry point — nothing imports this.'
  if (cycles > 0 && pr >= 0.05) return 'In cycles and high impact — refactor may affect many modules.'
  if (cycles > 0) return 'Participates in circular dependencies.'
  if (pr >= 0.05 && bet >= 0.02) return 'High impact and bridge — many depend on this; lies on key paths.'
  if (pr >= 0.05) return 'High impact — many modules depend on this.'
  if (bet >= 0.02) return 'Bridge — lies on many shortest paths between modules.'
  return null
}

/** Folder metrics panel: show only the folder name (last segment), not full path. */
function folderDisplayName(path: string | null): string {
  if (!path) return ''
  const parts = path.replace(/\\/g, '/').split('/').filter(Boolean)
  return parts.length > 0 ? parts[parts.length - 1]! : path
}

// Tooltips for module metric labels (accessibility + discoverability)
const METRIC_TOOLTIPS: Record<string, string> = {
  'Imports (fan-out)': 'Number of modules this file imports (outgoing edges).',
  'Imported by (fan-in)': 'Number of modules that import this file (incoming edges).',
  Cycles: 'Number of circular dependency cycles this module participates in. Zero is good.',
  Instability: 'Ce = out/(in+out). 0% = stable (many depend on you), 100% = unstable (you depend on many).',
  Depth: 'Shortest distance from the nearest entry point (no incoming imports). 0 = entry point.',
  Closeness: 'How central as a dependency target. High = easily reached from many modules.',
  Eigenvector: 'Importance as a dependency target; high if imported by other important modules.',
  External: 'Share of this module’s imports that point to external packages (0–100%).',
  PageRank: 'Importance score; high if many modules depend on you (or depend on modules that depend on you).',
  Betweenness: 'How often this module lies on shortest paths between others; bridge modules score high.',
}

export function MetricsPanel() {
  const { analysis, selectedNode, setSelectedNode, selectedFolderPath } = useGraphStore()
  const [showPreview, setShowPreview] = useState(false)
  const [showExternalPackages, setShowExternalPackages] = useState(false)
  const [pathCopied, setPathCopied] = useState(false)

  const folderMetrics = useMemo(
    () =>
      analysis && selectedFolderPath
        ? computeFolderMetrics(analysis, selectedFolderPath)
        : null,
    [analysis, selectedFolderPath]
  )

  /** Single source for the metrics view: folder metrics when a folder is selected, else project metrics. */
  const display = useMemo((): {
    total_files: number
    total_imports: number
    max_import_depth: number
    graph_density: number
    internal_edges: number | undefined
    entry_points_count: number | undefined
    total_cycles: number
    avg_cycle_length: number | undefined
    max_cycle_length: number | undefined
    largest_scc_size: number | undefined
    external_node_count: number | undefined
    external_edges_ratio: number | undefined
    external_stdlib_count?: number
    external_package_count?: number
    statistics: GraphMetrics['statistics'] | FolderMetrics['statistics']
    circular_dependencies: string[][]
    cycle_details: CycleDetail[]
    isolated_modules: string[]
    isFolder: boolean
    folderPath: string | null
  } => {
    if (folderMetrics) {
      return {
        total_files: folderMetrics.total_files,
        total_imports: folderMetrics.total_imports,
        max_import_depth: folderMetrics.max_import_depth,
        graph_density: folderMetrics.graph_density,
        internal_edges: folderMetrics.internal_edges,
        entry_points_count: folderMetrics.entry_points_count,
        total_cycles: folderMetrics.total_cycles,
        avg_cycle_length: undefined,
        max_cycle_length: undefined,
        largest_scc_size: folderMetrics.largest_scc_size,
        external_node_count: folderMetrics.external_node_count,
        external_edges_ratio: folderMetrics.external_edges_ratio,
        external_stdlib_count: folderMetrics.external_stdlib_count,
        external_package_count: folderMetrics.external_package_count,
        statistics: folderMetrics.statistics,
        circular_dependencies: [],
        cycle_details: [],
        isolated_modules: folderMetrics.isolated_modules,
        isFolder: true,
        folderPath: selectedFolderPath,
      }
    }
    const { metrics } = analysis!
    return {
      total_files: metrics.total_files,
      total_imports: metrics.total_imports,
      max_import_depth: metrics.max_import_depth,
      graph_density: metrics.graph_density ?? 0,
      internal_edges: metrics.internal_edges,
      entry_points_count: metrics.entry_points_count,
      total_cycles: metrics.total_cycles ?? metrics.circular_dependencies.length,
      avg_cycle_length: metrics.avg_cycle_length,
      max_cycle_length: metrics.max_cycle_length,
      largest_scc_size: metrics.largest_scc_size,
      external_node_count: metrics.external_node_count,
      external_edges_ratio: metrics.external_edges_ratio,
      external_stdlib_count: undefined,
      external_package_count: undefined,
      statistics: metrics.statistics,
      circular_dependencies: metrics.circular_dependencies,
      cycle_details: metrics.cycle_details,
      isolated_modules: metrics.isolated_modules,
      isFolder: false,
      folderPath: null,
    }
  }, [analysis, folderMetrics, selectedFolderPath])

  if (!analysis) return null

  const copyPath = () => {
    if (!selectedNode) return
    navigator.clipboard.writeText(selectedNode.file_path)
    setPathCopied(true)
    setTimeout(() => setPathCopied(false), 2000)
  }

  return (
    <>
      <div className="rounded-xl border border-gray-200 dark:border-white/5 backdrop-blur-md bg-white/80 dark:bg-slate-900/50 p-5 space-y-5 flex flex-col max-h-[85vh] min-w-0">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight shrink-0 truncate">
          {selectedNode ? 'Module Details' : selectedFolderPath ? 'Folder Metrics' : 'Project Metrics'}
        </h2>
        {!selectedNode && !selectedFolderPath && (
          <p className="text-[11px] text-gray-500 dark:text-slate-400 shrink-0">
            Click the <span className="font-medium text-indigo-500 dark:text-indigo-400">focus icon</span> on a folder in the tree to view folder metrics.
          </p>
        )}

        {selectedNode ? (
          <div className="space-y-5 overflow-y-auto min-h-0 pr-1 -mr-1" aria-label="Module details content">
            {/* Phase 1: Header with gradient by type + role badges */}
            {(() => {
              const typeStyle = getTypeStyle(selectedNode.node_type)
              const roles = getModuleRoles(selectedNode)
              return (
                <div className={`rounded-xl p-3 border ${typeStyle.bg} ${typeStyle.border}`}>
                  <div className="flex items-start gap-2 min-w-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${typeStyle.bg} ${typeStyle.text}`}>
                      <FileCode className="w-4 h-4" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5">File</div>
                      <div className="text-sm text-gray-900 dark:text-gray-100 break-words leading-snug font-semibold">{selectedNode.label}</div>
                      {roles.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {roles.map((r) => (
                            <span
                              key={r}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/20 dark:bg-black/20 text-gray-700 dark:text-gray-300 border border-white/20 dark:border-white/10"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Degree and one-line summary */}
                      <div className="mt-2 text-[11px] text-gray-500 dark:text-gray-400 space-x-2">
                        <span className="font-mono tabular-nums">
                          Degree: {(selectedNode.import_count ?? 0) + (selectedNode.imported_by_count ?? 0)} ({selectedNode.imported_by_count ?? 0} in, {selectedNode.import_count ?? 0} out)
                        </span>
                        {(selectedNode.node_type !== 'external') && (
                          <>
                            <span>·</span>
                            <span>
                              {(selectedNode.cycle_count ?? 0) > 0
                                ? `${selectedNode.cycle_count} cycles`
                                : '0 cycles'}
                              {' · '}
                              {((selectedNode.instability ?? 0) * 100) >= 70 ? 'unstable' : ((selectedNode.instability ?? 0) * 100) >= 40 ? 'mixed' : 'stable'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Impact text */}
            {getImpactText(selectedNode) && (
              <div className="rounded-lg p-2.5 border border-indigo-500/20 bg-indigo-500/5 text-[11px] text-gray-700 dark:text-gray-300 min-w-0">
                {getImpactText(selectedNode)}
              </div>
            )}

            {/* Phase 2: Fan-out / Fan-in cards with semantic colors */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-indigo-500/15 to-indigo-600/10 rounded-xl p-3 border border-indigo-500/25 flex items-center gap-2 min-w-0" title={METRIC_TOOLTIPS['Imports (fan-out)']}>
                <div className="w-9 h-9 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                  <ArrowUpCircle className="w-4 h-4 text-indigo-500" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate">Imports (fan-out)</div>
                  <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400 font-mono-ui tabular-nums">{selectedNode.import_count}</div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-violet-500/15 to-violet-600/10 rounded-xl p-3 border border-violet-500/25 flex items-center gap-2 min-w-0" title={METRIC_TOOLTIPS['Imported by (fan-in)']}>
                <div className="w-9 h-9 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                  <ArrowDownCircle className="w-4 h-4 text-violet-500" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate">Imported by (fan-in)</div>
                  <div className="text-lg font-bold text-violet-600 dark:text-violet-400 font-mono-ui tabular-nums">{selectedNode.imported_by_count}</div>
                </div>
              </div>
            </div>

            {/* Phase 2: Metric cards with semantic colors */}
            <div className="grid grid-cols-3 gap-2 min-w-0">
              {(() => {
                const cycles = selectedNode.cycle_count ?? 0
                const instability = (selectedNode.instability ?? 0) * 100
                const depth = selectedNode.depth ?? 0
                return (
                  <>
                    <div className={`rounded-lg p-2 border text-center min-w-0 ${cycles > 0 ? 'bg-amber-500/10 border-amber-500/25' : 'bg-emerald-500/10 border-emerald-500/20'}`} title={METRIC_TOOLTIPS.Cycles}>
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5 truncate">Cycles</div>
                      <div className={`text-base font-bold font-mono-ui tabular-nums leading-tight ${cycles > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{cycles}</div>
                    </div>
                    <div className={`rounded-lg p-2 border text-center min-w-0 ${
                      instability >= 70 ? 'bg-amber-500/10 border-amber-500/25' : instability >= 40 ? 'bg-blue-500/10 border-blue-500/20' : 'bg-emerald-500/10 border-emerald-500/20'
                    }`} title={METRIC_TOOLTIPS.Instability}>
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5 truncate">Instab.</div>
                      <div className="text-base font-bold text-gray-900 dark:text-gray-100 font-mono-ui tabular-nums leading-tight">{instability.toFixed(0)}%</div>
                    </div>
                    <div className={`rounded-lg p-2 border text-center min-w-0 ${
                      depth === 0 ? 'bg-emerald-500/10 border-emerald-500/20' : depth <= 2 ? 'bg-blue-500/10 border-blue-500/20' : 'bg-violet-500/10 border-violet-500/20'
                    }`} title={METRIC_TOOLTIPS.Depth}>
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5 truncate">Depth</div>
                      <div className="text-base font-bold text-gray-900 dark:text-gray-100 font-mono-ui tabular-nums leading-tight">{depth}</div>
                    </div>
                    <div className="rounded-lg p-2 border border-sky-500/20 bg-sky-500/10 text-center min-w-0" title={METRIC_TOOLTIPS.Closeness}>
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5 truncate">Close.</div>
                      <div className="text-xs font-bold text-sky-600 dark:text-sky-400 font-mono-ui leading-tight">{((selectedNode.closeness ?? 0) * 100).toFixed(1)}%</div>
                    </div>
                    <div className="rounded-lg p-2 border border-fuchsia-500/20 bg-fuchsia-500/10 text-center min-w-0" title={METRIC_TOOLTIPS.Eigenvector}>
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5 truncate">Eigen.</div>
                      <div className="text-xs font-bold text-fuchsia-600 dark:text-fuchsia-400 font-mono-ui leading-tight truncate">{(selectedNode.eigenvector ?? 0).toFixed(3)}</div>
                    </div>
                    <div className="rounded-lg p-2 border border-amber-500/20 bg-amber-500/10 text-center min-w-0" title={METRIC_TOOLTIPS.External}>
                      <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5 truncate">Ext.</div>
                      <div className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono-ui leading-tight">{((selectedNode.external_ratio ?? 0) * 100).toFixed(0)}%</div>
                    </div>
                  </>
                )
              })()}
            </div>

            {/* Phase 3: Importance as colored progress cards + summary badge */}
            <div className="space-y-3 pt-1 min-w-0">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <span className="text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">Importance</span>
                {(selectedNode.pagerank ?? 0) >= 0.05 && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 shrink-0">
                    <Zap className="w-2.5 h-2.5" aria-hidden /> High impact
                  </span>
                )}
              </div>
              <div className="space-y-3 min-w-0">
                <div className="rounded-lg p-2 border border-indigo-500/20 bg-indigo-500/5 min-w-0" title={METRIC_TOOLTIPS.PageRank}>
                  <div className="flex items-center justify-between gap-2 mb-1.5 min-w-0">
                    <span className="text-[11px] font-medium text-indigo-400 truncate">PageRank</span>
                    <span className="text-[11px] font-mono font-semibold text-gray-100 tabular-nums shrink-0">{(selectedNode.pagerank * 100).toFixed(2)}%</span>
                  </div>
                  <div className="w-full bg-white/10 dark:bg-black/20 rounded-full h-2 overflow-hidden">
                    <div className="h-2 rounded-full transition-all duration-500 bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${Math.min(100, selectedNode.pagerank * 100)}%` }} />
                  </div>
                </div>
                <div className="rounded-lg p-2 border border-violet-500/20 bg-violet-500/5 min-w-0" title={METRIC_TOOLTIPS.Betweenness}>
                  <div className="flex items-center justify-between gap-2 mb-1.5 min-w-0">
                    <span className="text-[11px] font-medium text-violet-400 truncate">Betweenness</span>
                    <span className="text-[11px] font-mono font-semibold text-gray-100 tabular-nums shrink-0">{(selectedNode.betweenness * 100).toFixed(2)}%</span>
                  </div>
                  <div className="w-full bg-white/10 dark:bg-black/20 rounded-full h-2 overflow-hidden">
                    <div className="h-2 rounded-full transition-all duration-500 bg-gradient-to-r from-violet-500 to-purple-500" style={{ width: `${Math.min(100, selectedNode.betweenness * 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Phase 4: Type as pill (+ external_kind), Path with copy */}
            {(() => {
              const typeStyle = getTypeStyle(selectedNode.node_type)
              const externalKindLabel = selectedNode.node_type === 'external' && selectedNode.external_kind
                ? (selectedNode.external_kind === 'stdlib' ? 'Built-in' : 'Third-party')
                : null
              return (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Type</span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typeStyle.bg} ${typeStyle.border} ${typeStyle.text}`}>
                      {typeStyle.label}
                    </span>
                    {externalKindLabel && (
                      <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                        ({externalKindLabel})
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Path</span>
                      <button
                        type="button"
                        onClick={copyPath}
                        className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                        aria-label={pathCopied ? 'Path copied to clipboard' : 'Copy file path to clipboard'}
                      >
                        {pathCopied ? <Check className="w-3.5 h-3.5" aria-hidden /> : <Copy className="w-3.5 h-3.5" aria-hidden />}
                        {pathCopied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 break-all font-mono leading-snug bg-gray-100 dark:bg-white/5 rounded-lg px-3 py-2 border border-gray-200 dark:border-white/10 overflow-hidden min-w-0">
                      {selectedNode.file_path}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Phase 5: Prominent View File CTA */}
            {selectedNode.node_type !== 'external' && (
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 bg-indigo-500 text-white hover:bg-indigo-400 min-w-0"
                aria-label="View file content and imports"
              >
                <Eye className="w-4 h-4 shrink-0" aria-hidden />
                <span className="truncate">View File</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto min-h-0 pr-1 -mr-1" aria-label="Project metrics content">
            {/* Empty folder state: folder selected but no modules matched */}
            {display.isFolder && display.total_files === 0 && (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 dark:bg-amber-500/10 p-4 min-w-0">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  No modules in this folder
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300/90 mt-1">
                  <span title={display.folderPath ?? ''}>
                    {display.folderPath ? <> &quot;{folderDisplayName(display.folderPath)}&quot; has no analyzed modules.</> : 'This folder has no analyzed modules.'}
                  </span>
                  {' '}
                  Select another folder or click the focus icon again to clear the filter and see project metrics.
                </p>
              </div>
            )}

            {/* Summary strip */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400 font-medium min-w-0">
              {display.isFolder && (
                <>
                  <Folder className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400 shrink-0" aria-hidden />
                  <span className="text-teal-600 dark:text-teal-400 truncate" title={display.folderPath ?? ''}>{folderDisplayName(display.folderPath) || display.folderPath}</span>
                  <span className="text-gray-400 dark:text-gray-500">·</span>
                </>
              )}
              <span className="font-mono tabular-nums text-gray-700 dark:text-gray-300">{display.total_files}</span>
              <span>files</span>
              <span className="text-gray-400 dark:text-gray-500">·</span>
              <span className="font-mono tabular-nums text-gray-700 dark:text-gray-300">{display.total_imports}</span>
              <span>imports</span>
              {(display.entry_points_count != null && display.entry_points_count > 0) && (
                <>
                  <span className="text-gray-400 dark:text-gray-500">·</span>
                  <span className="font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{display.entry_points_count}</span>
                  <span>entry points</span>
                </>
              )}
              {display.total_cycles > 0 && (
                <>
                  <span className="text-gray-400 dark:text-gray-500">·</span>
                  <span className="font-mono tabular-nums text-amber-600 dark:text-amber-400">{display.total_cycles}</span>
                  <span>cycles</span>
                </>
              )}
            </div>

            {/* Internal / Folder card */}
            <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/5 dark:bg-indigo-500/5 p-4 space-y-3 min-w-0">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 dark:text-indigo-400 shrink-0" title={display.isFolder ? (display.folderPath ?? '') : undefined}>
                {display.isFolder ? <Folder className="w-4 h-4" aria-hidden /> : <FileCode className="w-4 h-4" aria-hidden />}
                {display.isFolder ? `Folder: ${folderDisplayName(display.folderPath) || (display.folderPath ?? '')}` : 'Internal'}
              </h3>
              <div className="grid grid-cols-2 gap-2 min-w-0">
                <div className="min-h-[72px] flex flex-col items-center justify-center p-2.5 rounded-lg border border-indigo-500/20 bg-white/5 dark:bg-white/5 text-center">
                  <span className="text-lg font-bold text-white font-mono-ui tabular-nums leading-tight">{display.total_files}</span>
                  <span className="text-[11px] text-slate-500 mt-1 leading-tight">Files</span>
                </div>
                <div className="min-h-[72px] flex flex-col items-center justify-center p-2.5 rounded-lg border border-indigo-500/20 bg-white/5 dark:bg-white/5 text-center">
                  <span className="text-lg font-bold text-white font-mono-ui tabular-nums leading-tight">{display.total_imports}</span>
                  <span className="text-[11px] text-slate-500 mt-1 leading-tight">Imports</span>
                </div>
                <div className="min-h-[72px] flex flex-col items-center justify-center p-2.5 rounded-lg border border-indigo-500/20 bg-white/5 dark:bg-white/5 text-center">
                  <span className="text-lg font-bold text-white font-mono-ui tabular-nums leading-tight">{display.max_import_depth}</span>
                  <span className="text-[11px] text-slate-500 mt-1 leading-tight">Max Depth</span>
                </div>
                <div className="min-h-[72px] flex flex-col items-center justify-center p-2.5 rounded-lg border border-indigo-500/20 bg-white/5 dark:bg-white/5 text-center">
                  <span className="text-lg font-bold text-white font-mono-ui tabular-nums leading-tight">{((display.graph_density ?? 0) * 100).toFixed(1)}%</span>
                  <span className="text-[11px] text-slate-500 mt-1 leading-tight">Density</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 min-w-0">
                {display.internal_edges != null && (
                  <div className="p-2.5 rounded-lg border border-indigo-500/20 bg-white/5 flex items-center gap-2 min-w-0">
                    <Network className="w-5 h-5 text-indigo-400 shrink-0" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-medium text-slate-500 truncate">Internal Edges</div>
                      <div className="text-sm font-bold text-white font-mono-ui tabular-nums">{display.internal_edges}</div>
                    </div>
                  </div>
                )}
                {display.entry_points_count != null && (
                  <div className="p-2.5 rounded-lg border border-indigo-500/20 bg-white/5 flex items-center gap-2 min-w-0">
                    <Box className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-medium text-slate-500 truncate">Entry Points</div>
                      <div className="text-sm font-bold text-white font-mono-ui tabular-nums">{display.entry_points_count}</div>
                    </div>
                  </div>
                )}
                <div className="p-2.5 rounded-lg border border-indigo-500/20 bg-white/5 flex items-center gap-2 min-w-0">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-medium text-slate-500 truncate">Cycles</div>
                    <div className="text-sm font-bold text-white font-mono-ui tabular-nums">{display.total_cycles}</div>
                  </div>
                </div>
                {(display.avg_cycle_length != null && display.avg_cycle_length > 0) && (
                  <div className="p-2.5 rounded-lg border border-indigo-500/20 bg-white/5 min-w-0">
                    <div className="text-[10px] font-medium text-slate-500 truncate">Avg / Max Cycle</div>
                    <div className="text-sm font-bold text-white font-mono-ui tabular-nums leading-tight">
                      {display.avg_cycle_length?.toFixed(1)} / {display.max_cycle_length ?? 0}
                    </div>
                  </div>
                )}
              </div>
              {display.largest_scc_size != null && display.largest_scc_size > 0 && (
                <div className="p-2.5 rounded-lg border border-amber-500/25 bg-amber-500/10 flex items-center gap-2 min-w-0">
                  <Layers className="w-5 h-5 text-amber-500 shrink-0" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-medium text-amber-600 dark:text-amber-400 truncate">Largest SCC</div>
                    <div className="text-sm font-bold text-amber-700 dark:text-amber-300 font-mono-ui">{display.largest_scc_size} modules</div>
                  </div>
                </div>
              )}
            </div>

            {/* External card: folder view shows Built-in vs Packages separately */}
            <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 dark:bg-sky-500/5 p-4 space-y-3 min-w-0">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-400 dark:text-sky-400 shrink-0">
                <Package className="w-4 h-4" aria-hidden />
                External
              </h3>
              {display.isFolder && (display.external_stdlib_count != null || display.external_package_count != null) ? (
                <div className="grid grid-cols-2 gap-2 min-w-0">
                  <div className="min-h-[72px] flex flex-col items-center justify-center p-2.5 rounded-lg border border-slate-500/20 bg-white/5 dark:bg-white/5 text-center">
                    <span className="text-lg font-bold text-white font-mono-ui tabular-nums leading-tight">
                      {display.external_stdlib_count ?? 0}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1 leading-tight">Built-in</span>
                  </div>
                  <div className="min-h-[72px] flex flex-col items-center justify-center p-2.5 rounded-lg border border-sky-500/20 bg-white/5 dark:bg-white/5 text-center">
                    <span className="text-lg font-bold text-white font-mono-ui tabular-nums leading-tight">
                      {display.external_package_count ?? 0}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1 leading-tight">Packages</span>
                  </div>
                  <div className="col-span-2 min-h-[56px] flex flex-col items-center justify-center p-2.5 rounded-lg border border-sky-500/20 bg-white/5 text-center">
                    <span className="text-sm font-bold text-white font-mono-ui tabular-nums leading-tight">
                      {((display.external_edges_ratio ?? 0) * 100).toFixed(1)}%
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1 leading-tight">External edge ratio</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 min-w-0">
                  <div className="min-h-[72px] flex flex-col items-center justify-center p-2.5 rounded-lg border border-sky-500/20 bg-white/5 dark:bg-white/5 text-center">
                    <span className="text-lg font-bold text-white font-mono-ui tabular-nums leading-tight">
                      {display.external_node_count ?? 0}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1 leading-tight">Packages</span>
                  </div>
                  <div className="min-h-[72px] flex flex-col items-center justify-center p-2.5 rounded-lg border border-sky-500/20 bg-white/5 dark:bg-white/5 text-center">
                    <span className="text-lg font-bold text-white font-mono-ui tabular-nums leading-tight">
                      {((display.external_edges_ratio ?? 0) * 100).toFixed(1)}%
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1 leading-tight">Edge Ratio</span>
                  </div>
                </div>
              )}
              {display.external_node_count != null && display.external_node_count > 0 && (
                <button
                  type="button"
                  onClick={() => setShowExternalPackages(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-sky-500/30 bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 dark:text-sky-300 font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500/50 min-w-0"
                  aria-label="View external packages details"
                >
                  <ExternalLink className="w-4 h-4 shrink-0" aria-hidden />
                  <span>View built-in &amp; packages</span>
                </button>
              )}
            </div>

            {/* Statistics */}
            {display.statistics && (
              <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <span className="text-xs font-semibold text-blue-300 truncate">Statistics</span>
                </div>
                <div className="space-y-1.5 text-xs text-blue-300/90 min-w-0">
                  <div className="flex justify-between gap-2">
                    <span className="text-blue-300/70 truncate shrink-0">Avg imports/file</span>
                    <span className="font-semibold font-mono-ui tabular-nums shrink-0">
                      {Number(display.statistics.avg_imports_per_file).toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-blue-300/70 truncate shrink-0">Max imports</span>
                    <span className="font-semibold font-mono-ui tabular-nums shrink-0">{display.statistics.max_imports_in_file}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-blue-300/70 text-[11px] mb-0.5">Most imported</div>
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className="font-mono text-blue-200 truncate" title={display.statistics.most_imported_module}>
                        {(display.statistics.most_imported_module ?? '').split(/[/\\]/).pop() ?? display.statistics.most_imported_module}
                      </span>
                      <span className="font-semibold font-mono-ui tabular-nums text-blue-200 shrink-0">{display.statistics.most_imported_count}×</span>
                    </div>
                  </div>
                </div>
                {(display.statistics.hub_modules?.length ?? 0) > 0 && (
                  <div className="mt-3 pt-2 border-t border-blue-500/20 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 text-[11px] font-medium text-blue-300/80 truncate">
                      <Zap className="w-3 h-3 shrink-0" aria-hidden />
                      Hub modules
                    </div>
                    <ul className="space-y-1 text-[11px] font-mono text-blue-300/90 min-w-0">
                      {display.statistics.hub_modules!.slice(0, 5).map(([module, score], i) => (
                        <li key={i} className="flex justify-between gap-2">
                          <span className="truncate" title={module}>{module.split(/[/\\]/).pop() ?? module}</span>
                          <span className="font-semibold shrink-0 tabular-nums">{(score * 100).toFixed(1)}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(display.statistics.top_importers?.length ?? 0) > 0 && (
                  <div className="mt-3 pt-2 border-t border-blue-500/20 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 text-[11px] font-medium text-blue-300/80 truncate">
                      <ArrowUpCircle className="w-3 h-3 shrink-0" aria-hidden />
                      Top importers
                    </div>
                    <ul className="space-y-1 text-[11px] font-mono text-blue-300/90 min-w-0">
                      {display.statistics.top_importers!.slice(0, 5).map((item, i) => (
                        <li key={i} className="flex justify-between gap-2">
                          <span className="truncate" title={item.module}>{item.module.split(/[/\\]/).pop() ?? item.module}</span>
                          <span className="font-semibold shrink-0">{item.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(display.statistics.top_imported?.length ?? 0) > 0 && (
                  <div className="mt-2 pt-2 border-t border-blue-500/20 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 text-[11px] font-medium text-blue-300/80 truncate">
                      <ArrowDownCircle className="w-3 h-3 shrink-0" aria-hidden />
                      Top imported
                    </div>
                    <ul className="space-y-1 text-[11px] font-mono text-blue-300/90 min-w-0">
                      {display.statistics.top_imported!.slice(0, 5).map((item, i) => (
                        <li key={i} className="flex justify-between gap-2">
                          <span className="truncate" title={item.module}>{item.module.split(/[/\\]/).pop() ?? item.module}</span>
                          <span className="font-semibold shrink-0">{item.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {display.circular_dependencies.length > 0 && (
              <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                  </div>
                  <span className="text-xs font-semibold text-red-300 truncate">Circular Deps</span>
                </div>
                <div className="text-[11px] text-red-300/90 mb-2">
                  {display.circular_dependencies.length} cycle(s) detected
                </div>
                {display.cycle_details.length > 0 && (
                  <div className="space-y-1.5 min-w-0">
                    {display.cycle_details.slice(0, 3).map((cycle, i) => (
                      <div
                        key={i}
                        className={`text-[11px] p-2 rounded-lg ${
                          cycle.severity === 'high'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {cycle.length} modules — {cycle.severity}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {display.isolated_modules.length > 0 && (
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Package className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <span className="text-xs font-semibold text-amber-300 truncate">Isolated</span>
                </div>
                <div className="text-[11px] text-amber-300/90 mb-2">
                  {display.isolated_modules.length} module(s) with no connections
                </div>
                <ul className="space-y-1 text-[11px] font-mono text-amber-300/90 min-w-0">
                  {display.isolated_modules.slice(0, 5).map((path, i) => (
                    <li key={i} className="truncate" title={path}>{path.split(/[/\\]/).pop() ?? path}</li>
                  ))}
                  {display.isolated_modules.length > 5 && (
                    <li className="text-amber-300/70 italic">+{display.isolated_modules.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {analysis.warnings.length > 0 && !selectedNode && (
          <div className="pt-3 border-t border-white/10 min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2 truncate">Warnings</div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto min-w-0">
              {analysis.warnings.slice(0, 5).map((warning, i) => (
                <div key={i} className="text-[11px] text-amber-300 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 break-words">
                  {warning}
                </div>
              ))}
              {analysis.warnings.length > 5 && (
                <div className="text-[11px] text-slate-500 italic">
                  +{analysis.warnings.length - 5} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showPreview && selectedNode && selectedNode.node_type !== 'external' && (
        <FilePreviewModal
          analysisId={analysis.id}
          filePath={selectedNode.file_path}
          projectPath={analysis.project_path}
          onClose={() => setShowPreview(false)}
        />
      )}

      {showExternalPackages && (
        <ExternalPackagesModal
          analysis={analysis}
          onClose={() => setShowExternalPackages(false)}
          onSelectNode={(nodeId) => {
            const node = analysis.nodes.find(n => n.id === nodeId)
            if (node) setSelectedNode(node)
          }}
        />
      )}
    </>
  )
}
