import { Search, Layout, Maximize2, Minimize2, Grid3X3, CircleDot } from 'lucide-react'
import { useGraphStore } from '@/stores/graphStore'

const layouts = [
  { id: 'cola', name: 'Cola' },
  { id: 'circle', name: 'Circle' },
  { id: 'grid', name: 'Grid' },
  { id: 'grid-tall', name: 'Grid (tall)' },
  { id: 'breadthfirst', name: 'Hierarchy' },
  { id: 'tree', name: 'Tree' },
  { id: 'concentric', name: 'Concentric' },
]

export function GraphFloatingControls() {
  const { searchQuery, setSearchQuery, layoutName, setLayoutName, isFullScreen, toggleFullScreen, graphBackground, setGraphBackground } = useGraphStore()

  return (
    <div
      data-skip-export
      className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl shadow-xl dark:shadow-black/30"
      role="toolbar"
      aria-label="Graph controls"
    >
      <div className="flex items-center gap-2 pl-1 pr-3 py-1.5 rounded-xl bg-gray-100/80 dark:bg-white/5 border border-gray-200/80 dark:border-white/5">
        <Search className="w-4 h-4 text-gray-500 dark:text-slate-400 shrink-0" aria-hidden />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search modules…"
          aria-label="Search modules by name or path"
          className="w-48 sm:w-56 bg-transparent border-0 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none font-mono-ui"
        />
      </div>
      <div className="h-6 w-px bg-gray-200 dark:bg-white/10" aria-hidden />
      <div className="flex items-center gap-2">
        <Layout className="w-4 h-4 text-gray-500 dark:text-slate-400 shrink-0" aria-hidden />
        <select
          value={layoutName}
          onChange={(e) => setLayoutName(e.target.value)}
          aria-label="Graph layout"
          className="bg-transparent border-0 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-0 cursor-pointer font-mono-ui pr-1"
        >
          {layouts.map((layout) => (
            <option key={layout.id} value={layout.id} className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white">
              {layout.name}
            </option>
          ))}
        </select>
      </div>
      <div className="h-6 w-px bg-gray-200 dark:bg-white/10" aria-hidden />
      <div className="flex items-center gap-1.5" role="group" aria-label="Graph background">
        <button
          type="button"
          onClick={() => setGraphBackground('dots')}
          className={`p-2 rounded-xl border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${graphBackground === 'dots' ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'border-gray-200 dark:border-white/10 bg-gray-100/80 dark:bg-white/5 hover:bg-gray-200/80 dark:hover:bg-white/10 text-gray-600 dark:text-slate-400'}`}
          aria-pressed={graphBackground === 'dots'}
          title="Dots background"
        >
          <CircleDot className="w-4 h-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => setGraphBackground('grid')}
          className={`p-2 rounded-xl border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 ${graphBackground === 'grid' ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'border-gray-200 dark:border-white/10 bg-gray-100/80 dark:bg-white/5 hover:bg-gray-200/80 dark:hover:bg-white/10 text-gray-600 dark:text-slate-400'}`}
          aria-pressed={graphBackground === 'grid'}
          title="Blueprint grid background"
        >
          <Grid3X3 className="w-4 h-4" aria-hidden />
        </button>
      </div>
      <div className="h-6 w-px bg-gray-200 dark:bg-white/10" aria-hidden />
      <button
        type="button"
        onClick={toggleFullScreen}
        className="p-2 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100/80 dark:bg-white/5 hover:bg-gray-200/80 dark:hover:bg-white/10 transition-colors"
        aria-label={isFullScreen ? 'Exit full screen' : 'Enter full screen'}
        title={isFullScreen ? 'Exit full screen (ESC)' : 'Enter full screen'}
      >
        {isFullScreen ? (
          <Minimize2 className="w-4 h-4 text-gray-600 dark:text-slate-400" aria-hidden />
        ) : (
          <Maximize2 className="w-4 h-4 text-gray-600 dark:text-slate-400" aria-hidden />
        )}
      </button>
    </div>
  )
}
