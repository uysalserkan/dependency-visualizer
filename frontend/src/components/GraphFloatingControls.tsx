import { useState, useRef } from 'react'
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

  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const isHeatmapActive = heatmapMode !== 'off'
  const isSearchExpanded = isSearchFocused || searchQuery.length > 0

  const handleSearchClick = () => {
    inputRef.current?.focus()
  }

  // Desktop: Modern Glassmorphism Island with Horizontal Scroll support
  const containerClasses = showLabels 
    ? `flex flex-col gap-5 ${className}`
    : `flex flex-row items-center gap-2 sm:gap-3 px-3 h-14 rounded-full border border-white/10 bg-slate-900/70 backdrop-blur-md shadow-2xl shadow-black/20 transition-all duration-300 w-auto max-w-full z-20 overflow-x-auto no-scrollbar select-none ${className}`;

  // Individual control container style
  const desktopControlClasses = "flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all focus-within:ring-2 focus-within:ring-indigo-500/40 shrink-0 min-w-0";
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
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {/* Search Module - Interactive Expansion */}
      <div 
        className={showLabels ? mobileItemClasses : `shrink-0 transition-all duration-300 ease-in-out cursor-pointer ${isSearchExpanded ? 'w-48 sm:w-64 lg:w-80' : 'w-10'}`}
        onClick={handleSearchClick}
      >
        {showLabels && (
          <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 ml-1 uppercase tracking-widest font-mono-ui">
            Search
          </label>
        )}
        <div className={`${inputContainerClasses} ${!showLabels && !isSearchExpanded ? 'justify-center px-0' : ''}`}>
          <Search className={`w-3.5 h-3.5 transition-colors ${isSearchExpanded ? 'text-white/40' : 'text-white/70'} shrink-0`} aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={searchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={showLabels || isSearchExpanded ? "Search modules…" : ""}
            aria-label="Search modules"
            className={`w-full bg-transparent border-0 text-xs placeholder:text-white/30 focus:outline-none focus:ring-0 font-mono-ui transition-opacity duration-300 ${isSearchExpanded || showLabels ? 'opacity-100 w-full ml-1' : 'opacity-0 w-0 p-0 overflow-hidden'} ${showLabels ? 'text-gray-900 dark:text-white' : 'text-white'}`}
          />
        </div>
      </div>
      
      {!showLabels && <div className="w-px h-4 bg-white/10 shrink-0 mx-0.5" aria-hidden />}

      {/* Layout Selection */}
      <div className={showLabels ? mobileItemClasses : "shrink-0"}>
        {showLabels && (
          <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 ml-1 uppercase tracking-widest font-mono-ui">
            Layout
          </label>
        )}
        <div className={`${showLabels ? inputContainerClasses : desktopControlClasses} relative group`}>
          <Layout className={`w-3.5 h-3.5 shrink-0 ${showLabels ? 'text-gray-400' : 'text-white/40'}`} aria-hidden />
          <div className={showLabels ? "w-full" : "flex items-center gap-1"}>
            <select
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value)}
              aria-label="Graph layout"
              className={`bg-transparent border-0 text-xs focus:outline-none focus:ring-0 cursor-pointer font-mono-ui appearance-none z-10 ${showLabels ? 'w-full text-gray-700 dark:text-gray-200' : 'w-full sm:w-auto pr-4 text-white/80'} ${!showLabels ? 'hidden sm:block' : ''}`}
            >
              {layouts.map((layout) => (
                <option key={layout.id} value={layout.id} className="bg-slate-900 text-white font-mono-ui">
                  {layout.name}
                </option>
              ))}
            </select>
            {!showLabels && (
              <ChevronDown className="absolute right-2 sm:right-2.5 w-3 h-3 text-white/30 pointer-events-none group-hover:text-white/50 transition-colors" />
            )}
          </div>
        </div>
      </div>

      {/* Heatmap Selection */}
      <div className={showLabels ? mobileItemClasses : "shrink-0"}>
        {showLabels && (
          <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 ml-1 uppercase tracking-widest font-mono-ui">
            Heatmap
          </label>
        )}
        <div className={`${showLabels ? inputContainerClasses : desktopControlClasses} relative group`}>
          <Flame className={`w-3.5 h-3.5 shrink-0 transition-colors ${isHeatmapActive ? 'text-orange-400' : showLabels ? 'text-gray-400' : 'text-white/40'}`} aria-hidden />
          <div className={showLabels ? "w-full" : "flex items-center gap-1"}>
            <select
              value={heatmapMode}
              onChange={(e) => setHeatmapMode(e.target.value as HeatmapMode)}
              aria-label="Refactor hotspots"
              className={`bg-transparent border-0 text-xs focus:outline-none focus:ring-0 cursor-pointer font-mono-ui appearance-none z-10 ${showLabels ? 'w-full text-gray-700 dark:text-gray-200' : 'w-full sm:w-auto pr-4 text-white/80'} ${!showLabels ? 'hidden sm:block' : ''}`}
            >
              {heatmapModeOptions.map((o) => (
                <option key={o.id} value={o.id} className="bg-slate-900 text-white font-mono-ui">
                  {o.name}
                </option>
              ))}
            </select>
            {!showLabels && (
              <ChevronDown className="absolute right-2 sm:right-2.5 w-3 h-3 text-white/30 pointer-events-none group-hover:text-white/50 transition-colors" />
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className={showLabels ? "flex items-center gap-3 pt-4" : "flex items-center gap-1 sm:gap-1.5 ml-auto shrink-0"}>
        {!showLabels && <div className="w-px h-4 bg-white/10 shrink-0 mx-0.5" aria-hidden />}
        <button
          type="button"
          onClick={requestFit}
          className={`${showLabels ? 'flex-1 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5' : 'p-2 sm:p-2.5 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10'} flex items-center justify-center gap-2 rounded-full text-white/70 hover:text-white transition-all active:scale-95 shrink-0`}
          aria-label="Fit graph to view"
          title="Fit to view"
        >
          <Focus className="w-3.5 h-3.5" aria-hidden />
          {showLabels && <span className="text-xs font-bold uppercase tracking-widest font-mono-ui">Fit to View</span>}
        </button>
        <button
          type="button"
          onClick={toggleFullScreen}
          className={`${showLabels ? 'flex-1 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5' : 'p-2 sm:p-2.5 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10'} flex items-center justify-center gap-2 rounded-lg text-gray-600 dark:text-slate-300 transition-all active:scale-95 shrink-0`}
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