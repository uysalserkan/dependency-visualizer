import { useMemo } from 'react'
import { FileCode, Layers, TrendingUp, Eye, ArrowDownCircle, ArrowUpCircle, Network, Folder } from 'lucide-react'
import { useGraphStore } from '@/stores/graphStore'
import { computeFolderMetrics } from '@/lib/folderMetrics'
import type { Node, GraphMetrics } from '@/types/api'
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

export function MetricsPanel() {
  const { 
    analysis, 
    selectedNode, 
    selectedFolderPath,
    setShowPreview,
    setShowImportRelations,
    setShowOutgoingModal,
    setShowIncomingModal,
  } = useGraphStore()

  const folderMetrics = useMemo(
    () =>
      analysis && selectedFolderPath
        ? computeFolderMetrics(analysis, selectedFolderPath)
        : null,
    [analysis, selectedFolderPath]
  )


  const display = useMemo((): {
    total_files: number
    total_imports: number
    max_import_depth: number
    total_cycles: number
    statistics: GraphMetrics['statistics'] | FolderMetrics['statistics']
    isFolder: boolean
    folderPath: string | null
  } => {
    if (folderMetrics) {
      return {
        total_files: folderMetrics.total_files,
        total_imports: folderMetrics.total_imports,
        max_import_depth: folderMetrics.max_import_depth,
        total_cycles: folderMetrics.total_cycles,
        statistics: folderMetrics.statistics,
        isFolder: true,
        folderPath: selectedFolderPath,
      }
    }
    const { metrics } = analysis!
    return {
      total_files: metrics.total_files,
      total_imports: metrics.total_imports,
      max_import_depth: metrics.max_import_depth,
      total_cycles: metrics.total_cycles ?? metrics.circular_dependencies.length,
      statistics: metrics.statistics,
      isFolder: false,
      folderPath: null,
    }
  }, [analysis, folderMetrics, selectedFolderPath])

  if (!analysis) return null

  const panelTitle = selectedNode ? 'Module Details' : selectedFolderPath ? 'Folder Metrics' : 'Project Metrics'
  const PanelIcon = selectedNode ? FileCode : selectedFolderPath ? Folder : Layers

  return (
    <>
      <div className="rounded-xl border border-gray-200 dark:border-white/5 backdrop-blur-md bg-white/80 dark:bg-slate-900/50 p-4 flex flex-col min-w-0 shrink-0">
        <div className="flex items-center justify-between gap-2 shrink-0 w-full mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center shrink-0">
              <PanelIcon className="w-4 h-4 text-gray-500 dark:text-slate-400" aria-hidden />
            </div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight truncate min-w-0">
              {panelTitle}
            </h2>
          </div>
        </div>

        <div className="space-y-5">
          {!selectedNode && !selectedFolderPath && (
            <p className="text-xs text-gray-500 dark:text-slate-400 shrink-0 leading-relaxed">
              Click the <span className="font-medium text-indigo-500 dark:text-indigo-400">focus icon</span> on a folder in the tree to view folder metrics.
            </p>
          )}

          {selectedNode ? (
            <div className="space-y-6" aria-label="Module details content">
              {(() => {
                const typeStyle = getTypeStyle(selectedNode.node_type)
                const roles = getModuleRoles(selectedNode)
                return (
                  <div className={`rounded-2xl p-5 border ${typeStyle.bg} ${typeStyle.border} backdrop-blur-xl relative overflow-hidden group`}>
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-current opacity-[0.03] rounded-full blur-2xl group-hover:opacity-[0.08] transition-opacity" />
                    <div className="flex items-start gap-4 min-w-0 relative z-10">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${typeStyle.bg} ${typeStyle.text} border ${typeStyle.border}`}>
                        <FileCode className="w-6 h-6" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${typeStyle.bg} ${typeStyle.text}`}>
                            {typeStyle.label}
                          </span>
                        </div>
                        <div className="text-base text-gray-900 dark:text-gray-100 break-words leading-tight font-black tracking-tight">{selectedNode.label}</div>
                        {roles.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {roles.map((r) => (
                              <span key={r} className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white/40 dark:bg-black/40 text-gray-700 dark:text-gray-300 border border-white/50 dark:border-white/10 shadow-sm">{r}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })()}

              {getImpactText(selectedNode) && (
                <div className="rounded-2xl p-4 border border-indigo-500/20 bg-indigo-500/5 text-xs font-medium text-indigo-700 dark:text-indigo-300 leading-relaxed shadow-sm">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{getImpactText(selectedNode)}</span>
                  </div>
                </div>
              )}

              {/* Module Action Stats */}
              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowOutgoingModal(true)} 
                  className="group bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-2xl p-4 border border-blue-500/20 flex flex-col gap-2 text-left hover:border-blue-500/40 transition active:scale-95"
                >
                  <div className="flex items-center justify-between">
                    <ArrowUpCircle className="w-5 h-5 text-blue-500" />
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest opacity-70">Imports</span>
                  </div>
                  <div className="text-2xl font-black tabular-nums text-blue-600 dark:text-blue-400">{selectedNode.import_count}</div>
                </button>
                
                <button 
                  type="button" 
                  onClick={() => setShowIncomingModal(true)} 
                  className="group bg-gradient-to-br from-violet-500/10 to-violet-600/5 rounded-2xl p-4 border border-violet-500/20 flex flex-col gap-2 text-left hover:border-violet-500/40 transition active:scale-95"
                >
                  <div className="flex items-center justify-between">
                    <ArrowDownCircle className="w-5 h-5 text-violet-500" />
                    <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest opacity-70">Dependents</span>
                  </div>
                  <div className="text-2xl font-black tabular-nums text-violet-600 dark:text-violet-400">{selectedNode.imported_by_count}</div>
                </button>
              </div>

              {/* Technical Metrics Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 text-center">
                  <div className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter mb-1">Cycles</div>
                  <div className={`text-sm font-black ${selectedNode.cycle_count ? 'text-amber-500' : 'text-gray-900 dark:text-white'}`}>{selectedNode.cycle_count ?? 0}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 text-center">
                  <div className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter mb-1">Depth</div>
                  <div className="text-sm font-black text-gray-900 dark:text-white">{selectedNode.depth ?? 0}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 text-center">
                  <div className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter mb-1">Instability</div>
                  <div className="text-sm font-black text-gray-900 dark:text-white">{((selectedNode.instability ?? 0) * 100).toFixed(0)}%</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowImportRelations(true)} 
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold border border-indigo-500/30 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 transition active:scale-[0.98]"
                >
                  <Network className="w-4 h-4" />
                  Explore Connections
                </button>
                {selectedNode.node_type !== 'external' && (
                  <button 
                    type="button" 
                    onClick={() => setShowPreview(true)} 
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 hover:shadow-indigo-500/40 transition active:scale-[0.98]"
                  >
                    <Eye className="w-4 h-4" />
                    Open Source Code
                  </button>
                )}
              </div>
            </div>
          ) : (

            <div className="space-y-6" aria-label="Project metrics content">
              {display.isFolder && display.total_files === 0 && (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">No modules in this folder</p>
                </div>
              )}

              {/* Enhanced Metric Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 transition hover:bg-blue-500/10">
                  <div className="flex items-center gap-2 mb-2">
                    <FileCode className="w-4 h-4 text-blue-500" />
                    <span className="text-[10px] font-bold text-blue-600/70 dark:text-blue-400/70 uppercase tracking-widest">Files</span>
                  </div>
                  <div className="text-2xl font-black text-blue-600 dark:text-blue-400 tabular-nums">{display.total_files}</div>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 transition hover:bg-indigo-500/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Network className="w-4 h-4 text-indigo-500" />
                    <span className="text-[10px] font-bold text-indigo-600/70 dark:text-indigo-400/70 uppercase tracking-widest">Imports</span>
                  </div>
                  <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums">{display.total_imports}</div>
                </div>

                <div className="p-4 rounded-2xl bg-violet-500/5 border border-violet-500/10 transition hover:bg-violet-500/10">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-violet-500" />
                    <span className="text-[10px] font-bold text-violet-600/70 dark:text-violet-400/70 uppercase tracking-widest">Depth</span>
                  </div>
                  <div className="text-2xl font-black text-violet-600 dark:text-violet-400 tabular-nums">{display.max_import_depth}</div>
                </div>

                <div className={`p-4 rounded-2xl border transition ${display.total_cycles > 0 ? 'bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10' : 'bg-emerald-500/5 border-emerald-500/10 hover:bg-emerald-500/10'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className={`w-4 h-4 ${display.total_cycles > 0 ? 'text-amber-500' : 'text-emerald-500'}`} />
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${display.total_cycles > 0 ? 'text-amber-600/70 dark:text-amber-400/70' : 'text-emerald-600/70 dark:text-emerald-400/70'}`}>Cycles</span>
                  </div>
                  <div className={`text-2xl font-black tabular-nums ${display.total_cycles > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{display.total_cycles}</div>
                </div>
              </div>

              {/* Health Score / Analysis */}
              <div className="p-5 rounded-3xl bg-slate-100/50 dark:bg-white/5 border border-gray-200 dark:border-white/5 overflow-hidden relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-gray-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Project Health</span>
                  </div>
                  <div className="text-xs font-black text-indigo-500 bg-indigo-500/10 px-2 py-1 rounded-lg">
                    {display.total_cycles === 0 ? 'EXCELLENT' : display.total_cycles < 5 ? 'STABLE' : 'CRITICAL'}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="w-full h-2 bg-gray-200 dark:bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition duration-1000 ${display.total_cycles === 0 ? 'bg-emerald-500 w-full' : display.total_cycles < 5 ? 'bg-amber-500 w-2/3' : 'bg-rose-500 w-1/3'}`} 
                    />
                  </div>
                  
                  {display.statistics && (
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between group">
                        <span className="text-[11px] font-medium text-gray-500 group-hover:text-gray-700 dark:group-hover:text-slate-300 transition-colors">Avg Imports/File</span>
                        <span className="text-xs font-bold tabular-nums text-gray-900 dark:text-gray-100">{Number(display.statistics.avg_imports_per_file).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between group">
                        <span className="text-[11px] font-medium text-gray-500 group-hover:text-gray-700 dark:group-hover:text-slate-300 transition-colors">Hotspot Module</span>
                        <span className="text-xs font-bold truncate max-w-[140px] text-indigo-600 dark:text-indigo-400" title={display.statistics.most_imported_module}>
                          {display.statistics.most_imported_module ? display.statistics.most_imported_module.split('/').pop() : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between group">
                        <span className="text-[11px] font-medium text-gray-500 group-hover:text-gray-700 dark:group-hover:text-slate-300 transition-colors">Dependency Density</span>
                        <span className="text-xs font-bold tabular-nums text-gray-900 dark:text-gray-100">
                          {display.total_files > 0 ? (display.total_imports / display.total_files).toFixed(1) : '0'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )
            }
            
