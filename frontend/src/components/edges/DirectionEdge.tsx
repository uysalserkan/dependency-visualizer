import { memo } from 'react'
import {
  BaseEdge,
  getBezierPath,
  getStraightPath,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react'
import { useGraphStore } from '@/stores/graphStore'
import { useThemeStore } from '@/stores/themeStore'

export interface DirectionEdgeData extends Record<string, unknown> {
  edgeType?: 'in' | 'out'
  dimmed?: boolean
  hovered?: boolean
}

const EDGE_WIDTH_MAP = { thin: 1, normal: 2, thick: 3 } as const
const EDGE_OPACITY_MAP = { faded: 0.5, normal: 0.7, solid: 1 } as const

function DirectionEdgeComponent(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, data } = props
  const isDark = useThemeStore((s) => s.isDark)
  const { edgeCurveStyle, edgeWidth, edgeOpacity } = useGraphStore()

  const edgeData = (data ?? {}) as DirectionEdgeData
  const edgeType = edgeData.edgeType
  const dimmed = edgeData.dimmed
  const hovered = edgeData.hovered

  const curveStyle = edgeCurveStyle === 'unbundled-bezier' ? 'bezier' : edgeCurveStyle
  const pathFn =
    curveStyle === 'straight'
      ? getStraightPath
      : curveStyle === 'bezier'
        ? getBezierPath
        : getSmoothStepPath
  const [path] = pathFn({ sourceX, sourceY, targetX, targetY })

  const width = EDGE_WIDTH_MAP[edgeWidth]
  const opacity = dimmed ? 0.2 : hovered ? 1 : EDGE_OPACITY_MAP[edgeOpacity]
  const strokeWidth = hovered ? width + 1 : edgeType !== undefined ? width + 1 : width

  let stroke = isDark ? '#64748b' : '#cbd5e1'
  let strokeDasharray: string | undefined
  if (edgeType === 'out') {
    stroke = '#3b82f6'
    strokeDasharray = undefined
  } else if (edgeType === 'in') {
    stroke = '#10b981'
    strokeDasharray = '5 5'
  }

  return (
    <BaseEdge
      id={id}
      path={path}
      style={{
        stroke,
        strokeWidth,
        strokeDasharray,
        opacity,
      }}
      markerEnd={props.markerEnd}
    />
  )
}

export const DirectionEdge = memo(DirectionEdgeComponent)
