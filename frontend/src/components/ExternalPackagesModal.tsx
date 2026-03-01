import { useState, useMemo } from 'react'
import { X, Search, Package, TrendingUp, ArrowUpRight, Box } from 'lucide-react'
import type { Node, AnalysisResult } from '@/types/api'

interface ExternalPackagesModalProps {
  analysis: AnalysisResult
  onClose: () => void
  onSelectNode: (nodeId: string) => void
}

type SortBy = 'name' | 'usage'

export function ExternalPackagesModal({ analysis, onClose, onSelectNode }: ExternalPackagesModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('usage')

  // Extract external nodes: split into built-in (stdlib) and third-party (package)
  const { builtIn, externalPackages } = useMemo(() => {
    const externals = analysis.nodes.filter(n => n.node_type === 'external')
    const usageCounts = new Map<string, number>()
    analysis.edges.forEach(edge => {
      const sourceNode = analysis.nodes.find(n => n.id === edge.source)
      const targetNode = analysis.nodes.find(n => n.id === edge.target)
      if (sourceNode?.node_type !== 'external' && targetNode?.node_type === 'external') {
        usageCounts.set(edge.target, (usageCounts.get(edge.target) ?? 0) + 1)
      }
    })
    const withUsage = externals.map(pkg => ({ ...pkg, usageCount: usageCounts.get(pkg.id) ?? 0 }))
    const builtIn = withUsage.filter(p => p.external_kind === 'stdlib')
    const packages = withUsage.filter(p => p.external_kind !== 'stdlib') // 'package' or legacy
    return { builtIn, externalPackages: packages }
  }, [analysis])

  const filterAndSort = (list: (Node & { usageCount: number })[]) => {
    let results = list
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      results = results.filter(p => p.label.toLowerCase().includes(q) || p.file_path.toLowerCase().includes(q))
    }
    if (sortBy === 'usage') results.sort((a, b) => b.usageCount - a.usageCount)
    else results.sort((a, b) => a.label.localeCompare(b.label))
    return results
  }

  const filteredBuiltIn = useMemo(() => filterAndSort(builtIn), [builtIn, searchQuery, sortBy])
  const filteredPackages = useMemo(() => filterAndSort(externalPackages), [externalPackages, searchQuery, sortBy])

  const totalUsage = builtIn.reduce((s, p) => s + p.usageCount, 0) + externalPackages.reduce((s, p) => s + p.usageCount, 0)

  const handlePackageClick = (pkg: Node & { usageCount: number }) => {
    onSelectNode(pkg.id)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="external-packages-title"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col border border-slate-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center">
              <Package className="w-5 h-5 text-sky-500" aria-hidden />
            </div>
            <div>
              <h2 id="external-packages-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Built-in &amp; External
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {builtIn.length} built-in • {externalPackages.length} package{externalPackages.length !== 1 ? 's' : ''} • {totalUsage} usage{totalUsage !== 1 ? 's' : ''}
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

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 p-6 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="text-center p-3 rounded-lg bg-slate-500/10 border border-slate-500/20">
            <div className="text-2xl font-bold text-slate-600 dark:text-slate-400">{builtIn.length}</div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Built-in</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-sky-500/10 border border-sky-500/20">
            <div className="text-2xl font-bold text-sky-600 dark:text-sky-400">{externalPackages.length}</div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Packages</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">{totalUsage}</div>
            <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">Total Imports</div>
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="flex gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search packages..."
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                aria-label="Search external packages"
              />
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-300 dark:border-slate-600">
              <button
                type="button"
                onClick={() => setSortBy('usage')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${sortBy === 'usage'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                aria-label="Sort by usage"
              >
                <TrendingUp className="w-3.5 h-3.5 inline mr-1" aria-hidden />
                Usage
              </button>
              <button
                type="button"
                onClick={() => setSortBy('name')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${sortBy === 'name'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                aria-label="Sort alphabetically"
              >
                A-Z
              </button>
            </div>
          </div>
        </div>

        {/* Lists: Built-in then External packages */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0 space-y-6">
          {/* Built-in (stdlib) */}
          <section aria-labelledby="builtin-heading">
            <h3 id="builtin-heading" className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              <Box className="w-4 h-4 text-slate-500" aria-hidden />
              Built-in ({filteredBuiltIn.length})
            </h3>
            {filteredBuiltIn.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
                {searchQuery ? 'No built-in modules match' : 'No built-in modules in this project'}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredBuiltIn.map((pkg) => (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => handlePackageClick(pkg)}
                    className="w-full flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-750 hover:border-slate-300 dark:hover:border-slate-600 transition group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-slate-500/15 flex items-center justify-center shrink-0 group-hover:bg-slate-500/25">
                        <Box className="w-4 h-4 text-slate-500" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{pkg.label}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate font-mono">{pkg.file_path}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-bold text-violet-600 dark:text-violet-400">{pkg.usageCount}</span>
                      <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600" aria-hidden />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* External packages */}
          <section aria-labelledby="packages-heading">
            <h3 id="packages-heading" className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              <Package className="w-4 h-4 text-sky-500" aria-hidden />
              External packages ({filteredPackages.length})
            </h3>
            {filteredPackages.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-2">
                {searchQuery ? 'No packages match' : 'No third-party packages'}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredPackages.map((pkg) => (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => handlePackageClick(pkg)}
                    className="w-full flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 hover:border-sky-300 dark:hover:border-sky-600 transition group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-lg bg-sky-500/15 flex items-center justify-center shrink-0 group-hover:bg-sky-500/25">
                        <Package className="w-4 h-4 text-sky-500" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{pkg.label}</span>
                          {pkg.version && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-600 shrink-0" title="Installed version">
                              v{pkg.version}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate font-mono">{pkg.file_path}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <div className="text-right">
                        <div className="text-sm font-bold text-violet-600 dark:text-violet-400">{pkg.usageCount}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          import{pkg.usageCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-sky-500 transition-colors" aria-hidden />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
