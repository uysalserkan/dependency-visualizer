import { useState } from 'react'
import { AlertCircle, Package, FileCode, GitBranch, Layers, TrendingUp, Eye, ArrowDownCircle, ArrowUpCircle, Network, Box, Copy, Check, Zap, ExternalLink } from 'lucide-react'
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
      <div className="glass dark:glass rounded-2xl border dark:border-white/10 p-8 space-y-6 glass-hover flex flex-col max-h-[85vh]">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight shrink-0">
          {selectedNode ? 'Module Details' : 'Project Metrics'}
        </h2>

        {selectedNode ? (
          <div className="space-y-5 overflow-y-auto min-h-0 pr-1 -mr-1" aria-label="Module details content">
            {/* Phase 1: Header with gradient by type + role badges */}
            {(() => {
              const typeStyle = getTypeStyle(selectedNode.node_type)
              const roles = getModuleRoles(selectedNode)
              return (
                <div className={`rounded-xl p-4 border ${typeStyle.bg} ${typeStyle.border}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${typeStyle.bg} ${typeStyle.text}`}>
                      <FileCode className="w-5 h-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">File</div>
                      <div className="text-sm text-gray-900 dark:text-gray-100 break-all leading-relaxed font-semibold">{selectedNode.label}</div>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-indigo-500/15 to-indigo-600/10 rounded-xl p-4 border border-indigo-500/25 flex items-center gap-3" title={METRIC_TOOLTIPS['Imports (fan-out)']}>
                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
                  <ArrowUpCircle className="w-5 h-5 text-indigo-500" aria-hidden />
                </div>
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">Imports (fan-out)</div>
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{selectedNode.import_count}</div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-violet-500/15 to-violet-600/10 rounded-xl p-4 border border-violet-500/25 flex items-center gap-3" title={METRIC_TOOLTIPS['Imported by (fan-in)']}>
                <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                  <ArrowDownCircle className="w-5 h-5 text-violet-500" aria-hidden />
                </div>
                <div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">Imported by (fan-in)</div>
                  <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">{selectedNode.imported_by_count}</div>
                </div>
              </div>
            </div>

            {/* Phase 2: Metric cards with semantic colors */}
            <div className="grid grid-cols-3 gap-3">
              {(() => {
                const cycles = selectedNode.cycle_count ?? 0
                const instability = (selectedNode.instability ?? 0) * 100
                const depth = selectedNode.depth ?? 0
                return (
                  <>
                    <div className={`rounded-xl p-3 border text-center ${cycles > 0 ? 'bg-amber-500/10 border-amber-500/25' : 'bg-emerald-500/10 border-emerald-500/20'}`} title={METRIC_TOOLTIPS.Cycles}>
                      <div className="text-[10px] uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1 font-medium">Cycles</div>
                      <div className={`text-lg font-bold ${cycles > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{cycles}</div>
                    </div>
                    <div className={`rounded-xl p-3 border text-center ${
                      instability >= 70 ? 'bg-amber-500/10 border-amber-500/25' : instability >= 40 ? 'bg-blue-500/10 border-blue-500/20' : 'bg-emerald-500/10 border-emerald-500/20'
                    }`} title={METRIC_TOOLTIPS.Instability}>
                      <div className="text-[10px] uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1 font-medium">Instability</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{instability.toFixed(0)}%</div>
                    </div>
                    <div className={`rounded-xl p-3 border text-center ${
                      depth === 0 ? 'bg-emerald-500/10 border-emerald-500/20' : depth <= 2 ? 'bg-blue-500/10 border-blue-500/20' : 'bg-violet-500/10 border-violet-500/20'
                    }`} title={METRIC_TOOLTIPS.Depth}>
                      <div className="text-[10px] uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1 font-medium">Depth</div>
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{depth}</div>
                    </div>
                    <div className="rounded-xl p-3 border border-sky-500/20 bg-sky-500/10 text-center" title={METRIC_TOOLTIPS.Closeness}>
                      <div className="text-[10px] uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1 font-medium">Closeness</div>
                      <div className="text-sm font-bold text-sky-600 dark:text-sky-400">{((selectedNode.closeness ?? 0) * 100).toFixed(1)}%</div>
                    </div>
                    <div className="rounded-xl p-3 border border-fuchsia-500/20 bg-fuchsia-500/10 text-center" title={METRIC_TOOLTIPS.Eigenvector}>
                      <div className="text-[10px] uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1 font-medium">Eigenvector</div>
                      <div className="text-sm font-bold text-fuchsia-600 dark:text-fuchsia-400">{(selectedNode.eigenvector ?? 0).toFixed(3)}</div>
                    </div>
                    <div className="rounded-xl p-3 border border-amber-500/20 bg-amber-500/10 text-center" title={METRIC_TOOLTIPS.External}>
                      <div className="text-[10px] uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1 font-medium">External</div>
                      <div className="text-sm font-bold text-amber-600 dark:text-amber-400">{((selectedNode.external_ratio ?? 0) * 100).toFixed(0)}%</div>
                    </div>
                  </>
                )
              })()}
            </div>

            {/* Phase 3: Importance as colored progress cards + summary badge */}
            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Importance</span>
                {(selectedNode.pagerank ?? 0) >= 0.05 && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    <Zap className="w-3 h-3" aria-hidden /> High impact
                  </span>
                )}
              </div>
              <div className="space-y-4">
                <div className="rounded-xl p-3 border border-indigo-500/20 bg-indigo-500/5" title={METRIC_TOOLTIPS.PageRank}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">PageRank</span>
                    <span className="text-xs font-mono font-semibold text-gray-900 dark:text-gray-100">{(selectedNode.pagerank * 100).toFixed(2)}%</span>
                  </div>
                  <div className="w-full bg-white/10 dark:bg-black/20 rounded-full h-2.5 overflow-hidden">
                    <div className="h-2.5 rounded-full transition-all duration-500 bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${Math.min(100, selectedNode.pagerank * 100)}%` }} />
                  </div>
                </div>
                <div className="rounded-xl p-3 border border-violet-500/20 bg-violet-500/5" title={METRIC_TOOLTIPS.Betweenness}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-violet-600 dark:text-violet-400">Betweenness</span>
                    <span className="text-xs font-mono font-semibold text-gray-900 dark:text-gray-100">{(selectedNode.betweenness * 100).toFixed(2)}%</span>
                  </div>
                  <div className="w-full bg-white/10 dark:bg-black/20 rounded-full h-2.5 overflow-hidden">
                    <div className="h-2.5 rounded-full transition-all duration-500 bg-gradient-to-r from-violet-500 to-purple-500" style={{ width: `${Math.min(100, selectedNode.betweenness * 100)}%` }} />
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
                    <div className="text-xs text-gray-600 dark:text-gray-400 break-all font-mono leading-relaxed bg-gray-100 dark:bg-white/5 rounded-lg px-3 py-2.5 border border-gray-200 dark:border-white/10">
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
                className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600 shadow-lg shadow-indigo-500/25 dark:shadow-indigo-500/15"
                aria-label="View file content and imports"
              >
                <Eye className="w-5 h-5" aria-hidden />
                <span>View File</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4 overflow-y-auto min-h-0 pr-1 -mr-1" aria-label="Project metrics content">
            {/* Main metrics with gradients */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-5 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 rounded-xl border border-indigo-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                    <FileCode className="w-5 h-5 text-indigo-500" aria-hidden />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Files</span>
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.total_files}</span>
              </div>

              <div className="flex items-center justify-between p-5 bg-gradient-to-br from-violet-500/10 to-purple-500/10 rounded-xl border border-violet-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                    <GitBranch className="w-5 h-5 text-violet-500" aria-hidden />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Imports</span>
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.total_imports}</span>
              </div>

              <div className="flex items-center justify-between p-5 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-purple-500" aria-hidden />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Max Depth</span>
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metrics.max_import_depth}
                </span>
              </div>
            </div>

            {/* Phase 1: graph density & total cycles */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-xl">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Density</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {((metrics.graph_density ?? 0) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-xl">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Cycles</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {metrics.total_cycles ?? metrics.circular_dependencies.length}
                </div>
              </div>
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-xl col-span-2">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">External Dependencies</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {((metrics.external_edges_ratio ?? 0) * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Enriched: entry points, external packages, internal edges, cycle stats, SCC */}
            <div className="grid grid-cols-2 gap-3">
              {(metrics.entry_points_count != null || metrics.external_node_count != null) && (
                <>
                  {metrics.entry_points_count != null && (
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-xl flex items-center gap-3">
                      <Box className="w-8 h-8 text-emerald-500/80 shrink-0" aria-hidden />
                      <div>
                        <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Entry Points</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">{metrics.entry_points_count}</div>
                      </div>
                    </div>
                  )}
                  {metrics.external_node_count != null && (
                    <button
                      type="button"
                      onClick={() => setShowExternalPackages(true)}
                      className="p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-xl flex items-center gap-3 hover:bg-white/10 hover:border-sky-500/30 transition-all group w-full text-left"
                      aria-label="View external packages details"
                    >
                      <Package className="w-8 h-8 text-sky-500/80 shrink-0 group-hover:text-sky-500 transition-colors" aria-hidden />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-600 dark:text-gray-400">External Packages</div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">{metrics.external_node_count}</div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-sky-500 transition-colors shrink-0" aria-hidden />
                    </button>
                  )}
                </>
              )}
              {metrics.internal_edges != null && (
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-xl flex items-center gap-3">
                  <Network className="w-8 h-8 text-violet-500/80 shrink-0" aria-hidden />
                  <div>
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400">Internal Edges</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{metrics.internal_edges}</div>
                  </div>
                </div>
              )}
              {(metrics.avg_cycle_length != null && metrics.avg_cycle_length > 0) && (
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-xl">
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Avg / Max Cycle Length</div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {metrics.avg_cycle_length?.toFixed(1)} / {metrics.max_cycle_length ?? 0}
                  </div>
                </div>
              )}
              {metrics.largest_scc_size != null && metrics.largest_scc_size > 0 && (
                <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20 flex items-center gap-3 col-span-2">
                  <Layers className="w-8 h-8 text-amber-500 shrink-0" aria-hidden />
                  <div>
                    <div className="text-xs font-medium text-amber-700 dark:text-amber-300">Largest SCC (tangled core)</div>
                    <div className="text-lg font-bold text-amber-800 dark:text-amber-200">{metrics.largest_scc_size} modules</div>
                  </div>
                </div>
              )}
            </div>

            {/* Statistics */}
            {metrics.statistics && (
              <div className="p-5 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-blue-300">Statistics</span>
                </div>
                <div className="space-y-2 text-sm text-gray-700 dark:text-blue-300/90">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-blue-300/70">Avg imports/file</span>
                    <span className="font-semibold">{metrics.statistics.avg_imports_per_file}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-blue-300/70">Max imports</span>
                    <span className="font-semibold">{metrics.statistics.max_imports_in_file}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-blue-300/70">Most imported</span>
                    <span className="font-semibold">{metrics.statistics.most_imported_count}x</span>
                  </div>
                </div>
                {(metrics.statistics.top_importers?.length ?? 0) > 0 && (
                  <div className="mt-4 pt-3 border-t border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2 text-xs font-medium text-gray-600 dark:text-blue-300/80">
                      <ArrowUpCircle className="w-3.5 h-3.5" aria-hidden />
                      Top importers (fan-out)
                    </div>
                    <ul className="space-y-1 text-xs font-mono text-gray-700 dark:text-blue-300/90 truncate">
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
                  <div className="mt-3 pt-3 border-t border-blue-500/20">
                    <div className="flex items-center gap-2 mb-2 text-xs font-medium text-gray-600 dark:text-blue-300/80">
                      <ArrowDownCircle className="w-3.5 h-3.5" aria-hidden />
                      Top imported (fan-in)
                    </div>
                    <ul className="space-y-1 text-xs font-mono text-gray-700 dark:text-blue-300/90 truncate">
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
              <div className="p-5 bg-red-500/10 rounded-xl border border-red-500/20">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-red-300">
                    Circular Dependencies
                  </span>
                </div>
                <div className="text-sm text-gray-700 dark:text-red-300/90 mb-3">
                  {metrics.circular_dependencies.length} cycle(s) detected
                </div>
                {metrics.cycle_details.length > 0 && (
                  <div className="space-y-2">
                    {metrics.cycle_details.slice(0, 3).map((cycle, i) => (
                      <div
                        key={i}
                        className={`text-xs p-3 rounded-lg backdrop-blur-xl ${
                          cycle.severity === 'high'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {cycle.length} modules — {cycle.severity} severity
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {metrics.isolated_modules.length > 0 && (
              <div className="p-5 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Package className="w-4 h-4 text-amber-500" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-amber-300">Isolated Modules</span>
                </div>
                <div className="text-sm text-gray-700 dark:text-amber-300/90">
                  {metrics.isolated_modules.length} module(s) with no connections
                </div>
              </div>
            )}
          </div>
        )}

        {analysis.warnings.length > 0 && !selectedNode && (
          <div className="pt-4 border-t border-white/10">
            <div className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Warnings</div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {analysis.warnings.slice(0, 5).map((warning, i) => (
                <div key={i} className="text-xs text-amber-300 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20 backdrop-blur-xl">
                  {warning}
                </div>
              ))}
              {analysis.warnings.length > 5 && (
                <div className="text-xs text-gray-500 dark:text-gray-500 italic">
                  +{analysis.warnings.length - 5} more warnings
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
