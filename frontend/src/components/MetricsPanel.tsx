import { useState } from 'react'
import { AlertCircle, Package, FileCode, GitBranch, Layers, TrendingUp, Eye } from 'lucide-react'
import { useGraphStore } from '@/stores/graphStore'
import { FilePreviewModal } from './FilePreviewModal'

export function MetricsPanel() {
  const { analysis, selectedNode } = useGraphStore()
  const [showPreview, setShowPreview] = useState(false)

  if (!analysis) return null

  const { metrics } = analysis

  return (
    <>
      <div className="glass dark:glass rounded-2xl border dark:border-white/10 p-8 space-y-6 glass-hover">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
          {selectedNode ? 'Module Details' : 'Project Metrics'}
        </h2>

        {selectedNode ? (
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">File</div>
              <div className="text-sm text-gray-900 dark:text-gray-100 break-all leading-relaxed font-medium">{selectedNode.label}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-indigo-500/10 to-violet-500/10 rounded-xl p-4 border border-indigo-500/20">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">Imports</div>
                <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                  {selectedNode.import_count}
                </div>
              </div>

              <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 rounded-xl p-4 border border-violet-500/20">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">Imported By</div>
                <div className="text-3xl font-bold text-violet-600 dark:text-violet-400">
                  {selectedNode.imported_by_count}
                </div>
              </div>
            </div>

            {/* Phase 1 & 2 metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center backdrop-blur-xl">
                <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 font-medium">Cycles</div>
                <div className={`text-lg font-bold ${(selectedNode.cycle_count ?? 0) > 0 ? 'text-amber-500' : 'text-gray-700 dark:text-gray-300'}`}>
                  {selectedNode.cycle_count ?? 0}
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center backdrop-blur-xl">
                <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 font-medium">Instability</div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {((selectedNode.instability ?? 0) * 100).toFixed(0)}%
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center backdrop-blur-xl">
                <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 font-medium">Depth</div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {selectedNode.depth ?? 0}
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center backdrop-blur-xl">
                <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 font-medium">Closeness</div>
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {((selectedNode.closeness ?? 0) * 100).toFixed(1)}%
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center backdrop-blur-xl">
                <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 font-medium">Eigenvector</div>
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {(selectedNode.eigenvector ?? 0).toFixed(3)}
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/10 text-center backdrop-blur-xl">
                <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 font-medium">External</div>
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {((selectedNode.external_ratio ?? 0) * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Importance Scores with gradient bars */}
            <div className="space-y-4 pt-2">
              <div className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Importance</div>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">PageRank</span>
                    <span className="text-xs font-mono font-semibold text-gray-900 dark:text-gray-100">
                      {(selectedNode.pagerank * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden backdrop-blur-xl">
                    <div
                      className="h-2 rounded-full transition-all duration-500 bg-gradient-to-r from-indigo-500 to-violet-500"
                      style={{ width: `${selectedNode.pagerank * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Centrality</span>
                    <span className="text-xs font-mono font-semibold text-gray-900 dark:text-gray-100">
                      {(selectedNode.betweenness * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden backdrop-blur-xl">
                    <div
                      className="h-2 rounded-full transition-all duration-500 bg-gradient-to-r from-violet-500 to-purple-500"
                      style={{ width: `${selectedNode.betweenness * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Type</div>
              <div className="text-sm text-gray-900 dark:text-gray-100 capitalize font-medium">{selectedNode.node_type}</div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Path</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 break-all font-mono leading-relaxed bg-white/5 rounded-lg p-3 border border-white/10 backdrop-blur-xl">
                {selectedNode.file_path}
              </div>
            </div>

            {/* Preview Button with gradient */}
            {selectedNode.node_type !== 'external' && (
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="w-full flex items-center justify-center gap-3 px-5 py-3 bg-white/5 hover:bg-white/10 text-gray-900 dark:text-white rounded-xl font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-xl border border-white/10"
              >
                <Eye className="w-4 h-4" aria-hidden />
                <span className="text-sm">View File</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
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
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  )
}
