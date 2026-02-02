import { useState } from 'react'
import { AlertCircle, Package, FileCode, Layers, TrendingUp, Eye, ArrowDownCircle, ArrowUpCircle, Network, Box, Copy, Check, Zap, ExternalLink } from 'lucide-react'
import { useGraphStore } from '@/stores/graphStore'
import { FilePreviewModal } from './FilePreviewModal'
import { ExternalPackagesModal } from './ExternalPackagesModal'
import type { Node } from '@/types/api'

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
  const { analysis, selectedNode, setSelectedNode } = useGraphStore()
  const [showPreview, setShowPreview] = useState(false)
  const [showExternalPackages, setShowExternalPackages] = useState(false)
  const [pathCopied, setPathCopied] = useState(false)

  if (!analysis) return null

  const { metrics } = analysis

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
          {selectedNode ? 'Module Details' : 'Project Metrics'}
        </h2>

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
                    </div>
                  </div>
                </div>
              )
            })()}

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

            {/* Phase 4: Type as pill, Path with copy */}
            {(() => {
              const typeStyle = getTypeStyle(selectedNode.node_type)
              return (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Type</span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${typeStyle.bg} ${typeStyle.border} ${typeStyle.text}`}>
                      {typeStyle.label}
                    </span>
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
            {/* Internal card */}
            <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/5 dark:bg-indigo-500/5 p-4 space-y-3 min-w-0">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-400 dark:text-indigo-400 shrink-0">
                <FileCode className="w-4 h-4" aria-hidden />
                Internal
              </h3>
              <div className="grid grid-cols-2 gap-2 min-w-0">
                <div className="min-h-[72px] flex flex-col items-center justify-center p-2.5 rounded-lg border border-indigo-500/20 bg-white/5 dark:bg-white/5 text-center">
                  <span className="text-lg font-bold text-white font-mono-ui tabular-nums leading-tight">{metrics.total_files}</span>
                  <span className="text-[11px] text-slate-500 mt-1 leading-tight">Files</span>
                </div>
                <div className="min-h-[72px] flex flex-col items-center justify-center p-2.5 rounded-lg border border-indigo-500/20 bg-white/5 dark:bg-white/5 text-center">
                  <span className="text-lg font-bold text-white font-mono-ui tabular-nums leading-tight">{metrics.total_imports}</span>
                  <span className="text-[11px] text-slate-500 mt-1 leading-tight">Imports</span>
                </div>
                <div className="min-h-[72px] flex flex-col items-center justify-center p-2.5 rounded-lg border border-indigo-500/20 bg-white/5 dark:bg-white/5 text-center">
                  <span className="text-lg font-bold text-white font-mono-ui tabular-nums leading-tight">{metrics.max_import_depth}</span>
                  <span className="text-[11px] text-slate-500 mt-1 leading-tight">Max Depth</span>
                </div>
                <div className="min-h-[72px] flex flex-col items-center justify-center p-2.5 rounded-lg border border-indigo-500/20 bg-white/5 dark:bg-white/5 text-center">
                  <span className="text-lg font-bold text-white font-mono-ui tabular-nums leading-tight">{((metrics.graph_density ?? 0) * 100).toFixed(1)}%</span>
                  <span className="text-[11px] text-slate-500 mt-1 leading-tight">Density</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 min-w-0">
                {metrics.internal_edges != null && (
                  <div className="p-2.5 rounded-lg border border-indigo-500/20 bg-white/5 flex items-center gap-2 min-w-0">
                    <Network className="w-5 h-5 text-indigo-400 shrink-0" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-medium text-slate-500 truncate">Internal Edges</div>
                      <div className="text-sm font-bold text-white font-mono-ui tabular-nums">{metrics.internal_edges}</div>
                    </div>
                  </div>
                )}
                {metrics.entry_points_count != null && (
                  <div className="p-2.5 rounded-lg border border-indigo-500/20 bg-white/5 flex items-center gap-2 min-w-0">
                    <Box className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-medium text-slate-500 truncate">Entry Points</div>
                      <div className="text-sm font-bold text-white font-mono-ui tabular-nums">{metrics.entry_points_count}</div>
                    </div>
                  </div>
                )}
                <div className="p-2.5 rounded-lg border border-indigo-500/20 bg-white/5 flex items-center gap-2 min-w-0">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-medium text-slate-500 truncate">Cycles</div>
                    <div className="text-sm font-bold text-white font-mono-ui tabular-nums">{metrics.total_cycles ?? metrics.circular_dependencies.length}</div>
                  </div>
                </div>
                {(metrics.avg_cycle_length != null && metrics.avg_cycle_length > 0) && (
                  <div className="p-2.5 rounded-lg border border-indigo-500/20 bg-white/5 min-w-0">
                    <div className="text-[10px] font-medium text-slate-500 truncate">Avg / Max Cycle</div>
                    <div className="text-sm font-bold text-white font-mono-ui tabular-nums leading-tight">
                      {metrics.avg_cycle_length?.toFixed(1)} / {metrics.max_cycle_length ?? 0}
                    </div>
                  </div>
                )}
              </div>
              {metrics.largest_scc_size != null && metrics.largest_scc_size > 0 && (
                <div className="p-2.5 rounded-lg border border-amber-500/25 bg-amber-500/10 flex items-center gap-2 min-w-0">
                  <Layers className="w-5 h-5 text-amber-500 shrink-0" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-medium text-amber-600 dark:text-amber-400 truncate">Largest SCC</div>
                    <div className="text-sm font-bold text-amber-700 dark:text-amber-300 font-mono-ui">{metrics.largest_scc_size} modules</div>
                  </div>
                </div>
              )}
            </div>

            {/* External card */}
            <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 dark:bg-sky-500/5 p-4 space-y-3 min-w-0">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-400 dark:text-sky-400 shrink-0">
                <Package className="w-4 h-4" aria-hidden />
                External
              </h3>
              <div className="grid grid-cols-2 gap-2 min-w-0">
                <div className="min-h-[72px] flex flex-col items-center justify-center p-2.5 rounded-lg border border-sky-500/20 bg-white/5 dark:bg-white/5 text-center">
                  <span className="text-lg font-bold text-white font-mono-ui tabular-nums leading-tight">
                    {metrics.external_node_count ?? 0}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 leading-tight">Packages</span>
                </div>
                <div className="min-h-[72px] flex flex-col items-center justify-center p-2.5 rounded-lg border border-sky-500/20 bg-white/5 dark:bg-white/5 text-center">
                  <span className="text-lg font-bold text-white font-mono-ui tabular-nums leading-tight">
                    {((metrics.external_edges_ratio ?? 0) * 100).toFixed(1)}%
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 leading-tight">Edge Ratio</span>
                </div>
              </div>
              {metrics.external_node_count != null && metrics.external_node_count > 0 && (
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
            {metrics.statistics && (
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
                    <span className="font-semibold font-mono-ui tabular-nums shrink-0">{metrics.statistics.avg_imports_per_file}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-blue-300/70 truncate shrink-0">Max imports</span>
                    <span className="font-semibold font-mono-ui tabular-nums shrink-0">{metrics.statistics.max_imports_in_file}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-blue-300/70 truncate shrink-0">Most imported</span>
                    <span className="font-semibold font-mono-ui tabular-nums shrink-0">{metrics.statistics.most_imported_count}x</span>
                  </div>
                </div>
                {(metrics.statistics.top_importers?.length ?? 0) > 0 && (
                  <div className="mt-3 pt-2 border-t border-blue-500/20 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 text-[11px] font-medium text-blue-300/80 truncate">
                      <ArrowUpCircle className="w-3 h-3 shrink-0" aria-hidden />
                      Top importers
                    </div>
                    <ul className="space-y-1 text-[11px] font-mono text-blue-300/90 min-w-0">
                      {metrics.statistics.top_importers!.slice(0, 5).map((item, i) => (
                        <li key={i} className="flex justify-between gap-2">
                          <span className="truncate" title={item.module}>{item.module.split(/[/\\]/).pop() ?? item.module}</span>
                          <span className="font-semibold shrink-0">{item.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(metrics.statistics.top_imported?.length ?? 0) > 0 && (
                  <div className="mt-2 pt-2 border-t border-blue-500/20 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 text-[11px] font-medium text-blue-300/80 truncate">
                      <ArrowDownCircle className="w-3 h-3 shrink-0" aria-hidden />
                      Top imported
                    </div>
                    <ul className="space-y-1 text-[11px] font-mono text-blue-300/90 min-w-0">
                      {metrics.statistics.top_imported!.slice(0, 5).map((item, i) => (
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

            {metrics.circular_dependencies.length > 0 && (
              <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                  </div>
                  <span className="text-xs font-semibold text-red-300 truncate">Circular Deps</span>
                </div>
                <div className="text-[11px] text-red-300/90 mb-2">
                  {metrics.circular_dependencies.length} cycle(s) detected
                </div>
                {metrics.cycle_details.length > 0 && (
                  <div className="space-y-1.5 min-w-0">
                    {metrics.cycle_details.slice(0, 3).map((cycle, i) => (
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

            {metrics.isolated_modules.length > 0 && (
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Package className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <span className="text-xs font-semibold text-amber-300 truncate">Isolated</span>
                </div>
                <div className="text-[11px] text-amber-300/90">
                  {metrics.isolated_modules.length} module(s) with no connections
                </div>
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
