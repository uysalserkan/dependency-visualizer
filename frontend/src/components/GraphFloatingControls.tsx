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

  const isHeatmapActive = heatmapMode !== 'off'

  // Desktop: Modern Glassmorphism Island
  // Mobile (showLabels): Clean stacked list for drawer
  const containerClasses = showLabels 
    ? `flex flex-col gap-5 ${className}`
    : `flex flex-row items-center gap-3 px-3 h-14 rounded-full border border-white/10 bg-slate-900/70 backdrop-blur-md shadow-2xl shadow-black/20 ${isFullScreen ? 'mb-8 scale-105' : 'mb-2'} transition-all duration-300 w-auto max-w-fit mx-auto ${className}`;

  // Individual control container style (glass inside glass)
  const desktopControlClasses = "flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all focus-within:ring-2 focus-within:ring-indigo-500/40";
  const mobileItemClasses = "flex flex-col gap-2 w-full";

  const inputContainerClasses = showLabels
    ? "flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all"
    : desktopControlClasses;

  return (
    <div
      data-skip-export
      className={containerClasses}
      role="toolbar"
      aria-label="Graph controls"
    >
      {/* Search Module - Left */}
      <div className={showLabels ? mobileItemClasses : "min-w-[160px] sm:min-w-[220px]"}>
        {showLabels && (
          <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 ml-1 uppercase tracking-widest font-mono-ui">
            Search
          </label>
        )}
        <div className={inputContainerClasses}>
          <Search className="w-3.5 h-3.5 text-white/40 shrink-0" aria-hidden />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={showLabels ? "Search modules…" : "Search…"}
            aria-label="Search modules"
            className={`w-full bg-transparent border-0 text-xs placeholder:text-white/30 focus:outline-none focus:ring-0 font-mono-ui ${showLabels ? 'text-gray-900 dark:text-white' : 'text-white'}`}
          />
        </div>
      </div>
      
      {!showLabels && <div className="w-px h-4 bg-white/10 shrink-0 mx-1" aria-hidden />}

      {/* Layout Selection - Middle */}
      <div className={showLabels ? mobileItemClasses : ""}>
        {showLabels && (
          <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 ml-1 uppercase tracking-widest font-mono-ui">
            Layout
          </label>
        )}
        <div className={`${showLabels ? inputContainerClasses : desktopControlClasses} relative group`}>
          <Layout className={`w-3.5 h-3.5 shrink-0 ${showLabels ? 'text-gray-400' : 'text-white/40'}`} aria-hidden />
          <select
            value={layoutName}
            onChange={(e) => setLayoutName(e.target.value)}
            aria-label="Graph layout"
            className={`w-auto bg-transparent border-0 text-xs focus:outline-none focus:ring-0 cursor-pointer font-mono-ui appearance-none pr-5 z-10 min-w-[70px] ${showLabels ? 'text-gray-700 dark:text-gray-200' : 'text-white/80'}`}
          >
            {layouts.map((layout) => (
              <option key={layout.id} value={layout.id} className="bg-slate-900 text-white font-mono-ui">
                {layout.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 w-3 h-3 text-white/30 pointer-events-none group-hover:text-white/50 transition-colors" />
        </div>
      </div>

      {/* Heatmap Selection - Middle */}
      <div className={showLabels ? mobileItemClasses : ""}>
        {showLabels && (
          <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 ml-1 uppercase tracking-widest font-mono-ui">
            Heatmap
          </label>
        )}
        <div className={`${showLabels ? inputContainerClasses : desktopControlClasses} relative group`}>
          <Flame className={`w-3.5 h-3.5 shrink-0 transition-colors ${isHeatmapActive ? 'text-orange-400' : showLabels ? 'text-gray-400' : 'text-white/40'}`} aria-hidden />
          <select
            value={heatmapMode}
            onChange={(e) => setHeatmapMode(e.target.value as HeatmapMode)}
            aria-label="Refactor hotspots"
            className={`w-auto bg-transparent border-0 text-xs focus:outline-none focus:ring-0 cursor-pointer font-mono-ui appearance-none pr-5 z-10 min-w-[80px] ${showLabels ? 'text-gray-700 dark:text-gray-200' : 'text-white/80'}`}
          >
            {heatmapModeOptions.map((o) => (
              <option key={o.id} value={o.id} className="bg-slate-900 text-white font-mono-ui">
                {o.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 w-3 h-3 text-white/30 pointer-events-none group-hover:text-white/50 transition-colors" />
        </div>
      </div>

      {/* Action Buttons - Far Right */}
      <div className={showLabels ? "flex items-center gap-3 pt-4" : "flex items-center gap-1.5 ml-auto shrink-0"}>
        {!showLabels && <div className="w-px h-4 bg-white/10 shrink-0 mx-1" aria-hidden />}
        <button
          type="button"
          onClick={requestFit}
          className={`${showLabels ? 'flex-1 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5' : 'p-2.5 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10'} flex items-center justify-center gap-2 rounded-full text-white/70 hover:text-white transition-all active:scale-95`}
          aria-label="Fit graph to view"
          title="Fit to view"
        >
          <Focus className="w-3.5 h-3.5" aria-hidden />
          {showLabels && <span className="text-xs font-bold uppercase tracking-widest font-mono-ui">Fit to View</span>}
        </button>
        <button
          type="button"
          onClick={toggleFullScreen}
          className={`${showLabels ? 'flex-1 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5' : 'p-2.5 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10'} flex items-center justify-center gap-2 rounded-full text-white/70 hover:text-white transition-all active:scale-95`}
          aria-label={isFullScreen ? 'Exit full screen' : 'Enter full screen'}
          title={isFullScreen ? 'Exit full screen (ESC)' : 'Enter full screen'}
        >
          {isFullScreen ? (
            <Minimize2 className="w-3.5 h-3.5" aria-hidden />
          ) : (
            <Maximize2 className="w-3.5 h-3.5" aria-hidden />
          )}
          {showLabels && (
            <span className="text-xs font-bold uppercase tracking-widest font-mono-ui">
              {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
