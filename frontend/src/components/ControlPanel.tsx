import type { ComponentType, ReactNode } from 'react'
import {
  Eye,
  EyeOff,
  Type,
  Zap,
  Maximize2,
  Circle,
  Square,
  Hexagon,
  Diamond,
  Minus,
  Gauge,
  AlignLeft,
  GitBranch,
  Palette,
  CircleDot,
  Grid3X3,
  RotateCcw,
  Flame,
} from 'lucide-react'
import {
  useGraphStore,
  type NodeSizeMode,
  type EdgeWidthPreset,
  type NodeShapeType,
  type LabelFontSize,
  type NodeBorderWidth,
  type EdgeCurveStyle,
  type EdgeOpacityPreset,
  type HeatmapMode,
} from '@/stores/graphStore'
import { cn } from '@/lib/utils'

const nodeSizeOptions: { id: NodeSizeMode; name: string; short: string }[] = [
  { id: 'degree', name: 'By degree', short: 'Degree' },
  { id: 'fixed', name: 'Fixed size', short: 'Fixed' },
]

const edgeWidthOptions: { id: EdgeWidthPreset; name: string; Icon: ComponentType<{ className?: string }> }[] = [
  { id: 'thin', name: 'Thin', Icon: Minus },
  { id: 'normal', name: 'Normal', Icon: Minus },
  { id: 'thick', name: 'Thick', Icon: Minus },
]

const nodeShapeOptions: { id: NodeShapeType; name: string; Icon: ComponentType<{ className?: string }> }[] = [
  { id: 'ellipse', name: 'Ellipse', Icon: Circle },
  { id: 'rectangle', name: 'Rectangle', Icon: Square },
  { id: 'round-rectangle', name: 'Rounded', Icon: Hexagon },
  { id: 'diamond', name: 'Diamond', Icon: Diamond },
]

const labelFontSizeOptions: { id: LabelFontSize; name: string; short: string }[] = [
  { id: 'small', name: 'Small', short: 'S' },
  { id: 'medium', name: 'Medium', short: 'M' },
  { id: 'large', name: 'Large', short: 'L' },
]

const nodeBorderWidthOptions: { id: NodeBorderWidth; name: string }[] = [
  { id: 'thin', name: 'Thin' },
  { id: 'normal', name: 'Normal' },
  { id: 'thick', name: 'Thick' },
]

const edgeCurveStyleOptions: { id: EdgeCurveStyle; name: string }[] = [
  { id: 'bezier', name: 'Curved' },
  { id: 'unbundled-bezier', name: 'Unbundled' },
  { id: 'straight', name: 'Straight' },
]

const edgeOpacityOptions: { id: EdgeOpacityPreset; name: string }[] = [
  { id: 'faded', name: 'Faded' },
  { id: 'normal', name: 'Normal' },
  { id: 'solid', name: 'Solid' },
]

const heatmapModeOptions: { id: HeatmapMode; name: string }[] = [
  { id: 'off', name: 'Off' },
  { id: 'god_fanout', name: 'God Objects (fan-out)' },
  { id: 'god_fanin', name: 'God Objects (fan-in)' },
  { id: 'impact_pagerank', name: 'Impact (PageRank)' },
  { id: 'impact_betweenness', name: 'Impact (Betweenness)' },
]

function SegmentedControl<T extends string, O extends { id: T }>({
  value,
  onChange,
  options,
  optionLabel,
  optionValue,
  ariaLabel,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: readonly O[]
  optionLabel: (opt: O) => ReactNode
  optionValue: (opt: O) => T
  ariaLabel: string
  className?: string
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-slate-800/50 p-0.5',
        className
      )}
    >
      {options.map((opt) => {
        const isActive = value === optionValue(opt)
        return (
          <button
            key={String(optionValue(opt))}
            type="button"
            onClick={() => onChange(optionValue(opt))}
            aria-pressed={isActive}
            className={cn(
              'flex-1 min-w-0 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-md text-xs font-medium transition-all',
              isActive
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            {optionLabel(opt)}
          </button>
        )
      })}
    </div>
  )
}

function Switch({
  checked,
  onToggle,
  label,
  description,
  icon: Icon,
}: {
  checked: boolean
  onToggle: () => void
  label: string
  description?: string
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Icon
            className={cn(
              'w-4 h-4 shrink-0',
              checked ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-slate-500'
            )}
          />
          <span className="text-sm font-medium text-gray-900 dark:text-white">{label}</span>
        </div>
        {description && (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        className={cn(
          'shrink-0 relative inline-flex h-6 w-10 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900',
          checked ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-slate-600'
        )}
      >
        <span
          className={cn(
            'inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform translate-y-0.5',
            checked ? 'translate-x-4' : 'translate-x-0.5'
          )}
        />
      </button>
    </div>
  )
}

function SectionHeader({ icon: Icon, title }: { icon: ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20">
        <Icon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
      </div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-slate-400">{title}</h3>
    </div>
  )
}

function DisplayCard({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: ComponentType<{ className?: string }>
  children: ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-slate-800/30 overflow-hidden">
      <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-gray-200/60 dark:border-white/5">
        <Icon className="w-3.5 h-3.5 text-gray-500 dark:text-slate-400 shrink-0" aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
          {title}
        </span>
      </div>
      <div className="p-3.5 space-y-3.5">{children}</div>
    </div>
  )
}

const DISPLAY_DEFAULTS = {
  showNodeLabels: true,
  nodeSizeMode: 'degree' as const,
  edgeWidth: 'normal' as const,
  nodeShape: 'round-rectangle' as const,
  labelFontSize: 'medium' as const,
  nodeBorderWidth: 'normal' as const,
  edgeCurveStyle: 'bezier' as const,
  edgeOpacity: 'normal' as const,
  graphBackground: 'dots' as const,
  heatmapMode: 'off' as const,
}

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
    labelFontSize,
    setLabelFontSize,
    nodeBorderWidth,
    setNodeBorderWidth,
    edgeCurveStyle,
    setEdgeCurveStyle,
    edgeOpacity,
    setEdgeOpacity,
    layoutAnimation,
    setLayoutAnimation,
    requestFit,
    graphBackground,
    setGraphBackground,
    heatmapMode,
    setHeatmapMode,
  } = useGraphStore()

  const resetDisplay = () => {
    setShowNodeLabels(DISPLAY_DEFAULTS.showNodeLabels)
    setNodeSizeMode(DISPLAY_DEFAULTS.nodeSizeMode)
    setEdgeWidth(DISPLAY_DEFAULTS.edgeWidth)
    setNodeShape(DISPLAY_DEFAULTS.nodeShape)
    setLabelFontSize(DISPLAY_DEFAULTS.labelFontSize)
    setNodeBorderWidth(DISPLAY_DEFAULTS.nodeBorderWidth)
    setEdgeCurveStyle(DISPLAY_DEFAULTS.edgeCurveStyle)
    setEdgeOpacity(DISPLAY_DEFAULTS.edgeOpacity)
    setGraphBackground(DISPLAY_DEFAULTS.graphBackground)
    setHeatmapMode(DISPLAY_DEFAULTS.heatmapMode)
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/5 backdrop-blur-md bg-white/80 dark:bg-slate-900/50 overflow-hidden shadow-sm">
      <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(100vh-200px)]">
        {/* Display */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <SectionHeader icon={Type} title="Display" />
            <button
              type="button"
              onClick={resetDisplay}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              aria-label="Reset display to defaults"
              title="Reset display to defaults"
            >
              <RotateCcw className="w-3 h-3 shrink-0" aria-hidden />
              Reset
            </button>
          </div>

          <div className="space-y-4">
            {/* Nodes card */}
            <DisplayCard title="Nodes" icon={Gauge}>
              <Switch
                checked={showNodeLabels}
                onToggle={() => setShowNodeLabels(!showNodeLabels)}
                label="Node labels"
                description="Show labels on graph nodes"
                icon={Type}
              />
              <div>
                <label className="block text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-1.5">
                  Node size
                </label>
                <SegmentedControl
                  value={nodeSizeMode}
                  onChange={setNodeSizeMode}
                  options={nodeSizeOptions}
                  optionValue={(o) => o.id}
                  optionLabel={(o) => (
                    <>
                      <Gauge className="w-3.5 h-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{o.short}</span>
                    </>
                  )}
                  ariaLabel="Node size"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-1.5">
                  Node shape
                </label>
                <SegmentedControl
                  value={nodeShape}
                  onChange={setNodeShape}
                  options={nodeShapeOptions}
                  optionValue={(o) => o.id}
                  optionLabel={(o) => (
                    <span className="flex items-center justify-center" title={o.name}>
                      <o.Icon className="w-4 h-4 shrink-0" aria-hidden />
                    </span>
                  )}
                  ariaLabel="Node shape"
                  className="w-full grid grid-cols-4"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-1.5">
                  Label font size
                </label>
                <SegmentedControl
                  value={labelFontSize}
                  onChange={setLabelFontSize}
                  options={labelFontSizeOptions}
                  optionValue={(o) => o.id}
                  optionLabel={(o) => (
                    <>
                      <AlignLeft className="w-3.5 h-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{o.short}</span>
                    </>
                  )}
                  ariaLabel="Label font size"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-1.5">
                  Node border
                </label>
                <SegmentedControl
                  value={nodeBorderWidth}
                  onChange={setNodeBorderWidth}
                  options={nodeBorderWidthOptions}
                  optionValue={(o) => o.id}
                  optionLabel={(o) => <span className="truncate">{o.name}</span>}
                  ariaLabel="Node border width"
                  className="w-full"
                />
              </div>
            </DisplayCard>

            {/* Heatmap card */}
            <DisplayCard title="Heatmap" icon={Flame}>
              <p className="text-[11px] text-gray-500 dark:text-slate-400 mb-2">
                Red = refactor priority. Green = low.
              </p>
              <div>
                <label htmlFor="heatmap-mode" className="block text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-1.5">
                  Refactor hotspots
                </label>
                <select
                  id="heatmap-mode"
                  value={heatmapMode}
                  onChange={(e) => setHeatmapMode(e.target.value as HeatmapMode)}
                  aria-label="Heatmap mode"
                  className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-offset-slate-900 px-3 py-2"
                >
                  {heatmapModeOptions.map((o) => (
                    <option key={o.id} value={o.id} className="bg-white dark:bg-slate-900 text-gray-900 dark:text-white">
                      {o.name}
                    </option>
                  ))}
                </select>
                {heatmapMode !== 'off' && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 dark:text-slate-400 shrink-0">Low</span>
                    <div
                      className="flex-1 h-2 rounded-full overflow-hidden border border-gray-200/60 dark:border-white/10"
                      style={{
                        background: 'linear-gradient(to right, #22c55e, #f59e0b, #ef4444)',
                      }}
                      aria-hidden
                    />
                    <span className="text-[10px] text-gray-500 dark:text-slate-400 shrink-0">High</span>
                  </div>
                )}
              </div>
            </DisplayCard>

            {/* Edges card */}
            <DisplayCard title="Edges" icon={GitBranch}>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-1.5">
                  Edge width
                </label>
                <SegmentedControl
                  value={edgeWidth}
                  onChange={setEdgeWidth}
                  options={edgeWidthOptions}
                  optionValue={(o) => o.id}
                  optionLabel={(o) => (
                    <>
                      <o.Icon
                        className={cn(
                          'w-3.5 h-3.5 shrink-0',
                          o.id === 'thin' ? 'stroke-[2.5]' : o.id === 'thick' ? 'stroke-[4]' : ''
                        )}
                        aria-hidden
                      />
                      <span className="truncate">{o.name}</span>
                    </>
                  )}
                  ariaLabel="Edge width"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-1.5">
                  Edge style
                </label>
                <SegmentedControl
                  value={edgeCurveStyle}
                  onChange={setEdgeCurveStyle}
                  options={edgeCurveStyleOptions}
                  optionValue={(o) => o.id}
                  optionLabel={(o) => (
                    <>
                      <GitBranch className="w-3.5 h-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{o.name}</span>
                    </>
                  )}
                  ariaLabel="Edge curve style"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-1.5">
                  Edge opacity
                </label>
                <SegmentedControl
                  value={edgeOpacity}
                  onChange={setEdgeOpacity}
                  options={edgeOpacityOptions}
                  optionValue={(o) => o.id}
                  optionLabel={(o) => (
                    <>
                      <Palette className="w-3.5 h-3.5 shrink-0" aria-hidden />
                      <span className="truncate">{o.name}</span>
                    </>
                  )}
                  ariaLabel="Edge opacity"
                  className="w-full"
                />
              </div>
            </DisplayCard>

            {/* Background card */}
            <DisplayCard title="Canvas background" icon={Grid3X3}>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 dark:text-slate-400 mb-1.5">
                  Pattern
                </label>
                <div
                  role="group"
                  aria-label="Graph background"
                  className="inline-flex rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-slate-800/50 p-0.5 w-full"
                >
                  <button
                    type="button"
                    onClick={() => setGraphBackground('dots')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900',
                      graphBackground === 'dots'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                    )}
                    aria-pressed={graphBackground === 'dots'}
                    title="Dots pattern"
                  >
                    <CircleDot className="w-4 h-4 shrink-0" aria-hidden />
                    Dots
                  </button>
                  <button
                    type="button"
                    onClick={() => setGraphBackground('grid')}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900',
                      graphBackground === 'grid'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                    )}
                    aria-pressed={graphBackground === 'grid'}
                    title="Blueprint grid"
                  >
                    <Grid3X3 className="w-4 h-4 shrink-0" aria-hidden />
                    Grid
                  </button>
                </div>
              </div>
            </DisplayCard>
          </div>
        </section>

        {/* Layout */}
        <section className="pt-1 border-t border-gray-200/80 dark:border-white/5 space-y-3">
          <SectionHeader icon={Zap} title="Layout" />
          <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-slate-800/30 p-3.5">
            <Switch
              checked={layoutAnimation}
              onToggle={() => setLayoutAnimation(!layoutAnimation)}
              label="Animate layout"
              description="Smooth transitions when applying layout"
              icon={Zap}
            />
          </div>
        </section>

        {/* Filters */}
        <section className="pt-1 border-t border-gray-200/80 dark:border-white/5 space-y-3">
          <SectionHeader icon={Eye} title="External nodes" />
          <div className="space-y-2">
            <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-slate-800/30 p-3.5">
              <Switch
                checked={showStdlibNodes}
                onToggle={() => setShowStdlibNodes(!showStdlibNodes)}
                label="Built-in (stdlib)"
                description="e.g. os, json, path"
                icon={showStdlibNodes ? Eye : EyeOff}
              />
            </div>
            <div className="rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-slate-800/30 p-3.5">
              <Switch
                checked={showExternalPackages}
                onToggle={() => setShowExternalPackages(!showExternalPackages)}
                label="External packages"
                description="Third-party dependencies"
                icon={showExternalPackages ? Eye : EyeOff}
              />
            </div>
          </div>
        </section>

        {/* View */}
        <section className="pt-1 border-t border-gray-200/80 dark:border-white/5">
          <SectionHeader icon={Maximize2} title="View" />
          <button
            type="button"
            onClick={requestFit}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 transition-colors"
            aria-label="Fit graph to view"
          >
            <Maximize2 className="w-4 h-4" aria-hidden />
            Fit to screen
          </button>
        </section>
      </div>
    </div>
  )
}
