import { Handle, type NodeProps, Position } from '@xyflow/react'
import { memo } from 'react'
import { useGraphStore } from '@/stores/graphStore'
import { useThemeStore } from '@/stores/themeStore'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useViewportZoom } from '@/contexts/ViewportLODContext'
import { LOD_ZOOM_THRESHOLD } from '@/lib/constants'
import {
  nodeColorForId,
  gradientStopsForHex,
  heatToColor,
  LABEL_FONT_SIZE_MAP,
  NODE_BORDER_WIDTH_MAP,
} from '@/lib/graphNodeUtils'
import { cn } from '@/lib/utils'

export interface ModuleNodeData extends Record<string, unknown> {
  label: string
  file_path: string
  node_type: string
  external_kind?: 'stdlib' | 'package'
  highlighted?: boolean
  dimmed?: boolean
  hovered?: boolean
  degree?: number
  /** Heatmap: 0–1, red = high (refactor hotspot). Set when heatmap mode is on. */
  heat?: number
}

function ModuleNodeComponent(props: NodeProps) {
  const { id, data, selected } = props
  const isDark = useThemeStore((s) => s.isDark)
  const zoom = useViewportZoom()
  const isMobile = useIsMobile()
  const {
    showNodeLabels,
    nodeSizeMode,
    nodeShape,
    labelFontSize,
    nodeBorderWidth,
  } = useGraphStore()

  const showLabelsLOD =
    showNodeLabels && (!isMobile || zoom >= LOD_ZOOM_THRESHOLD)

  const d = data as ModuleNodeData
  const kind = d.external_kind
  const baseColor =
    kind === 'stdlib'
      ? isDark ? '#64748b' : '#94a3b8'
      : kind === 'package'
        ? isDark ? '#d97706' : '#f59e0b'
        : d.heat != null
          ? heatToColor(d.heat, isDark)
          : nodeColorForId(id)

  const [gradientLight, gradientDark] =
    kind === 'stdlib' || kind === 'package'
      ? [baseColor, baseColor]
      : gradientStopsForHex(baseColor)

  const borderPx = NODE_BORDER_WIDTH_MAP[nodeBorderWidth]
  const fontSize = LABEL_FONT_SIZE_MAP[labelFontSize]
  const degree = d.degree ?? 0
  const size =
    nodeSizeMode === 'fixed'
      ? 40
      : Math.max(30, Math.min(60, 30 + degree * 2))
  const width = size * 2.5
  const height = size

  const shapeClass =
    nodeShape === 'ellipse'
      ? 'rounded-full'
      : nodeShape === 'rectangle'
        ? 'rounded-none'
        : 'rounded-xl'

  const isDiamond = nodeShape === 'diamond'
  const dim = isDiamond ? size * 1.2 : width
  const diamondClip = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'

  return (
    <>
      <Handle type="target" position={Position.Top} className="!border-0 !w-0 !h-0 !min-w-0 !min-h-0" />
      <div
        className={cn(
          'flex items-center justify-center border box-border transition',
          shapeClass,
          d.dimmed === true && 'opacity-20',
          d.highlighted === true && 'ring-2 ring-amber-500 ring-offset-2 ring-offset-transparent',
          d.hovered === true && 'ring-2 ring-slate-400 ring-offset-2 ring-offset-transparent',
          selected === true && 'ring-2 ring-violet-400 ring-offset-2 ring-offset-transparent'
        )}
        style={{
          width: dim,
          height: isDiamond ? dim : height,
          borderWidth: borderPx,
          borderColor: baseColor,
          background: `linear-gradient(to bottom right, ${gradientLight}, ${gradientDark})`,
          fontSize,
          color: isDark ? '#f1f5f9' : '#1e293b',
          padding: '8%',
          ...(isDiamond ? { clipPath: diamondClip, WebkitClipPath: diamondClip } : {}),
        }}
      >
        {showLabelsLOD && d.label && (
          <span
            className="text-center font-mono-ui truncate max-w-full px-1"
            style={{
              textShadow: `0 0 1px ${baseColor}`,
              maxWidth: '100px',
            }}
          >
            {d.label}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!border-0 !w-0 !h-0 !min-w-0 !min-h-0" />
    </>
  )
}

export const ModuleNode = memo(ModuleNodeComponent)
