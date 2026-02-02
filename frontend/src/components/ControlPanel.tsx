import { Search, Layout, Eye, EyeOff } from 'lucide-react'
import { useGraphStore } from '@/stores/graphStore'

const layouts = [
  { id: 'cola', name: 'Cola (Force)' },
  { id: 'circle', name: 'Circle' },
  { id: 'grid', name: 'Grid' },
  { id: 'breadthfirst', name: 'Hierarchy' },
  { id: 'concentric', name: 'Concentric' },
]

export function ControlPanel() {
  const { 
    searchQuery, 
    setSearchQuery, 
    layoutName, 
    setLayoutName,
    showExternalNodes,
    setShowExternalNodes
  } = useGraphStore()

  return (
    <div className="glass dark:glass rounded-2xl border dark:border-white/10 p-8 space-y-6 glass-hover">
      <div className="space-y-3">
        <label htmlFor="search-modules" className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Search className="w-4 h-4 text-indigo-500" aria-hidden />
          <span>Search Modules</span>
        </label>
        <input
          id="search-modules"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name or path..."
          aria-label="Search modules by name or path"
          className="w-full px-4 py-3 bg-white/5 dark:bg-white/5 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all backdrop-blur-xl"
        />
      </div>

      <div className="space-y-3">
        <label htmlFor="layout-select" className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Layout className="w-4 h-4 text-indigo-500" aria-hidden />
          <span>Layout</span>
        </label>
        <select
          id="layout-select"
          value={layoutName}
          onChange={(e) => setLayoutName(e.target.value)}
          aria-label="Graph layout algorithm"
          className="w-full px-4 py-3 bg-white/5 dark:bg-white/5 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-gray-900 dark:text-white transition-all backdrop-blur-xl cursor-pointer"
        >
          {layouts.map((layout) => (
            <option key={layout.id} value={layout.id} className="bg-gray-900 text-white">
              {layout.name}
            </option>
          ))}
        </select>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowExternalNodes(!showExternalNodes)}
          aria-pressed={showExternalNodes}
          aria-label={showExternalNodes ? 'Hide external packages' : 'Show external packages'}
          className="w-full flex items-center justify-between px-4 py-3 bg-white/5 dark:bg-white/5 rounded-xl hover:bg-white/10 dark:hover:bg-white/10 text-gray-900 dark:text-white transition-all duration-300 backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        >
          <span className="text-sm font-medium flex items-center gap-2">
            {showExternalNodes ? (
              <Eye className="w-4 h-4 text-indigo-500" />
            ) : (
              <EyeOff className="w-4 h-4 text-gray-400" />
            )}
            <span>External Packages</span>
          </span>
          <div className={`w-11 h-6 rounded-full transition-colors duration-300 ${
            showExternalNodes ? 'bg-indigo-600' : 'bg-gray-600'
          } relative`}>
            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${
              showExternalNodes ? 'translate-x-5' : ''
            }`} />
          </div>
        </button>
      </div>
    </div>
  )
}
