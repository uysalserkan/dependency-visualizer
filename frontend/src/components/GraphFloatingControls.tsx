import { Search, Layout, Flame, Focus, Maximize2, Minimize2, ChevronDown } from 'lucide-react'
import { useGraphStore, type HeatmapMode } from '@/stores/graphStore'

const layouts = [
  { id: 'cola', name: 'Cola' },
  { id: 'circle', name: 'Circle' },
  { id: 'grid', name: 'Grid' },
  { id: 'grid-tall', name: 'Grid (tall)' },
  { id: 'breadthfirst', name: 'Hierarchy' },
  { id: 'tree', name: 'Tree' },
  { id: 'concentric', name: 'Concentric' },
]

const heatmapModeOptions: { id: HeatmapMode; name: string }[] = [
  { id: 'off', name: 'Off' },
  { id: 'god_fanout', name: 'God Objects (fan-out)' },
  { id: 'god_fanin', name: 'God Objects (fan-in)' },
  { id: 'impact_pagerank', name: 'Impact (PageRank)' },
  { id: 'impact_betweenness', name: 'Impact (Betweenness)' },
]

interface GraphFloatingControlsProps {
  className?: string
  showLabels?: boolean
}

export function GraphFloatingControls({ className = '', showLabels = false }: GraphFloatingControlsProps) {
  const {
    searchQuery,
    setSearchQuery,
    layoutName,
    setLayoutName,
    heatmapMode,
    setHeatmapMode,
    isFullScreen,
    toggleFullScreen,
    requestFit,
  } = useGraphStore()

  // Desktop: "Floating Island" pill shape
  // Mobile (showLabels): Clean stacked list
  const containerClasses = showLabels 
    ? `flex flex-col gap-5 ${className}`
    : `flex flex-wrap items-center justify-center gap-1 px-3 py-2 rounded-full border border-gray-200/50 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-2xl shadow-black/5 ${isFullScreen ? 'mb-8 scale-105' : 'mb-2'} transition-all duration-300 ${className}`;

  // On desktop, we remove the background from individual items to blend them into the "island"
  // On mobile, we keep the background for distinct touch areas
  const itemBaseClasses = "flex items-center gap-2 relative group transition-colors"
  const desktopItemClasses = `${itemBaseClasses} px-3 py-1.5 rounded-lg hover:bg-gray-100/50 dark:hover:bg-white/5`
  const mobileItemClasses = "flex flex-col gap-2 w-full"

  const inputContainerClasses = showLabels
    ? "flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all"
    : "flex items-center gap-2 min-w-[180px]";

  const Divider = () => (
    <div className="w-px h-5 bg-gray-300/50 dark:bg-white/10 mx-1" aria-hidden />
  )

  return (
    <div
      data-skip-export
      className={containerClasses}
      role="toolbar"
      aria-label="Graph controls"
    >
      {/* Search Module */}
      <div className={showLabels ? mobileItemClasses : desktopItemClasses}>
        {showLabels && (
          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 ml-1 uppercase tracking-wider">
            Search
          </label>
        )}
        <div className={inputContainerClasses}>
          <Search className={`w-4 h-4 text-gray-400 ${showLabels ? '' : 'shrink-0'}`} aria-hidden />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={showLabels ? "Search modules…" : "Search…"}
            aria-label="Search modules"
            className="w-full bg-transparent border-0 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-0 font-medium font-mono-ui"
          />
        </div>
      </div>
      
      {!showLabels && <Divider />}

      {/* Layout Selection */}
      <div className={showLabels ? mobileItemClasses : desktopItemClasses}>
        {showLabels && (
          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 ml-1 uppercase tracking-wider">
            Layout
          </label>
        )}
        <div className={`${inputContainerClasses} relative`}>
          <Layout className={`w-4 h-4 text-gray-400 ${showLabels ? '' : 'shrink-0'}`} aria-hidden />
          <select
            value={layoutName}
            onChange={(e) => setLayoutName(e.target.value)}
            aria-label="Graph layout"
            className="w-full bg-transparent border-0 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-0 cursor-pointer font-medium font-mono-ui appearance-none pr-6 z-10"
          >
            {layouts.map((layout) => (
              <option key={layout.id} value={layout.id} className="bg-white dark:bg-slate-900">
                {layout.name}
              </option>
            ))}
          </select>
          {/* Custom Chevron for select */}
          <ChevronDown className="absolute right-0 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {!showLabels && <Divider />}

      {/* Heatmap Selection */}
      <div className={showLabels ? mobileItemClasses : desktopItemClasses}>
        {showLabels && (
          <label className="text-xs font-bold text-gray-500 dark:text-slate-400 ml-1 uppercase tracking-wider">
            Heatmap
          </label>
        )}
        <div className={`${inputContainerClasses} relative`}>
          <Flame className={`w-4 h-4 text-gray-400 ${showLabels ? '' : 'shrink-0'}`} aria-hidden />
          <select
            value={heatmapMode}
            onChange={(e) => setHeatmapMode(e.target.value as HeatmapMode)}
            aria-label="Refactor hotspots"
            className="w-full bg-transparent border-0 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-0 cursor-pointer font-medium font-mono-ui appearance-none pr-6 z-10"
          >
            {heatmapModeOptions.map((o) => (
              <option key={o.id} value={o.id} className="bg-white dark:bg-slate-900">
                {o.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-0 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {!showLabels && <Divider />}

      {/* Action Buttons */}
      <div className={showLabels ? "flex items-center gap-3 pt-4" : "flex items-center gap-1 pl-1"}>
        <button
          type="button"
          onClick={requestFit}
          className={`${showLabels ? 'flex-1 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5' : 'p-2 hover:bg-gray-100/50 dark:hover:bg-white/5'} flex items-center justify-center gap-2 rounded-lg text-gray-600 dark:text-slate-300 transition-all active:scale-95`}
          aria-label="Fit graph to view"
          title="Fit to view"
        >
          <Focus className="w-4 h-4" aria-hidden />
          {showLabels && <span className="text-sm font-medium">Fit to View</span>}
        </button>
        <button
          type="button"
          onClick={toggleFullScreen}
          className={`${showLabels ? 'flex-1 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5' : 'p-2 hover:bg-gray-100/50 dark:hover:bg-white/5'} flex items-center justify-center gap-2 rounded-lg text-gray-600 dark:text-slate-300 transition-all active:scale-95`}
          aria-label={isFullScreen ? 'Exit full screen' : 'Enter full screen'}
          title={isFullScreen ? 'Exit full screen (ESC)' : 'Enter full screen'}
        >
          {isFullScreen ? (
            <Minimize2 className="w-4 h-4" aria-hidden />
          ) : (
            <Maximize2 className="w-4 h-4" aria-hidden />
          )}
          {showLabels && (
            <span className="text-sm font-medium">
              {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}




