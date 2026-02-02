import { Eye, EyeOff, Type, Zap, Maximize2 } from 'lucide-react'
import { useGraphStore, type NodeSizeMode, type EdgeWidthPreset, type NodeShapeType } from '@/stores/graphStore'

const nodeSizeOptions: { id: NodeSizeMode; name: string }[] = [
  { id: 'degree', name: 'By degree' },
  { id: 'fixed', name: 'Fixed size' },
]

const edgeWidthOptions: { id: EdgeWidthPreset; name: string }[] = [
  { id: 'thin', name: 'Thin' },
  { id: 'normal', name: 'Normal' },
  { id: 'thick', name: 'Thick' },
]

const nodeShapeOptions: { id: NodeShapeType; name: string }[] = [
  { id: 'ellipse', name: 'Ellipse' },
  { id: 'rectangle', name: 'Rectangle' },
  { id: 'round-rectangle', name: 'Rounded' },
  { id: 'diamond', name: 'Diamond' },
]

export function ControlPanel() {
  const {
    showStdlibNodes,
    setShowStdlibNodes,
    showExternalPackages,
    setShowExternalPackages,
    showNodeLabels,
    setShowNodeLabels,
    nodeSizeMode,
    setNodeSizeMode,
    edgeWidth,
    setEdgeWidth,
    nodeShape,
    setNodeShape,
    layoutAnimation,
    setLayoutAnimation,
    requestFit,
  } = useGraphStore()

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/5 backdrop-blur-md bg-white/80 dark:bg-slate-900/50 p-6 space-y-6 overflow-y-auto max-h-[calc(100vh-200px)]">
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-500">
          Display
        </h3>

        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-500 dark:text-slate-400">Node labels</label>
          <button
            type="button"
            onClick={() => setShowNodeLabels(!showNodeLabels)}
            aria-pressed={showNodeLabels}
            className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-white/5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-900 dark:text-white transition-all text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 border border-gray-200 dark:border-white/5"
          >
            <span className="flex items-center gap-2">
              <Type className="w-4 h-4 text-gray-500 dark:text-slate-400" />
              {showNodeLabels ? 'On' : 'Off'}
            </span>
            <div className={`w-9 h-5 rounded-full transition-colors ${showNodeLabels ? 'bg-indigo-500' : 'bg-slate-600'} relative`}>
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${showNodeLabels ? 'translate-x-4' : ''}`} />
            </div>
          </button>
        </div>

        <div className="space-y-2">
          <label htmlFor="node-size" className="text-xs font-medium text-gray-500 dark:text-slate-400">Node size</label>
          <select
            id="node-size"
            value={nodeSizeMode}
            onChange={(e) => setNodeSizeMode(e.target.value as NodeSizeMode)}
            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer font-mono-ui"
          >
            {nodeSizeOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="node-shape" className="text-xs font-medium text-gray-500 dark:text-slate-400">Node shape</label>
          <select
            id="node-shape"
            value={nodeShape}
            onChange={(e) => setNodeShape(e.target.value as NodeShapeType)}
            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer font-mono-ui"
          >
            {nodeShapeOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="edge-width" className="text-xs font-medium text-gray-500 dark:text-slate-400">Edge width</label>
          <select
            id="edge-width"
            value={edgeWidth}
            onChange={(e) => setEdgeWidth(e.target.value as EdgeWidthPreset)}
            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer font-mono-ui"
          >
            {edgeWidthOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Layout options */}
      <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-white/5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-500">
          Layout
        </h3>
        <button
          type="button"
          onClick={() => setLayoutAnimation(!layoutAnimation)}
          aria-pressed={layoutAnimation}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-white/5 dark:bg-white/5 rounded-lg hover:bg-white/10 dark:hover:bg-white/10 text-gray-900 dark:text-white transition-all text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        >
          <span className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-500" />
            Animate layout
          </span>
          <div className={`w-9 h-5 rounded-full transition-colors ${layoutAnimation ? 'bg-indigo-600' : 'bg-gray-600'} relative`}>
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${layoutAnimation ? 'translate-x-4' : ''}`} />
          </div>
        </button>
      </div>

      {/* Filters */}
      <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-white/5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-500">
          External nodes
        </h3>
        <button
          type="button"
          onClick={() => setShowStdlibNodes(!showStdlibNodes)}
          aria-pressed={showStdlibNodes}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-white/5 dark:bg-white/5 rounded-lg hover:bg-white/10 dark:hover:bg-white/10 text-gray-900 dark:text-white transition-all text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        >
          <span className="flex items-center gap-2">
            {showStdlibNodes ? <Eye className="w-4 h-4 text-indigo-500" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
            Built-in (stdlib)
          </span>
          <div className={`w-9 h-5 rounded-full transition-colors ${showStdlibNodes ? 'bg-indigo-600' : 'bg-gray-600'} relative`}>
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${showStdlibNodes ? 'translate-x-4' : ''}`} />
          </div>
        </button>
        <button
          type="button"
          onClick={() => setShowExternalPackages(!showExternalPackages)}
          aria-pressed={showExternalPackages}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-white/5 dark:bg-white/5 rounded-lg hover:bg-white/10 dark:hover:bg-white/10 text-gray-900 dark:text-white transition-all text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        >
          <span className="flex items-center gap-2">
            {showExternalPackages ? <Eye className="w-4 h-4 text-indigo-500" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
            External packages
          </span>
          <div className={`w-9 h-5 rounded-full transition-colors ${showExternalPackages ? 'bg-indigo-600' : 'bg-gray-600'} relative`}>
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${showExternalPackages ? 'translate-x-4' : ''}`} />
          </div>
        </button>
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-white/5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-500">
          View
        </h3>
        <button
          type="button"
          onClick={requestFit}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 border border-white/10 bg-transparent hover:bg-white/5 text-white"
          aria-label="Fit graph to view"
        >
          <Maximize2 className="w-4 h-4" />
          Fit to screen
        </button>
      </div>
    </div>
  )
}
