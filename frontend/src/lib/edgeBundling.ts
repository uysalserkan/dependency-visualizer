/**
 * Force-directed edge bundling (simplified FDEB).
 * Subdivides each edge into segments and iteratively moves subdivision points
 * toward neighboring edges so that similar paths cluster into bundles.
 */

export interface EdgeSegment {
  id: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
}

const SUBDIVISIONS = 20
const ITERATIONS = 60
const COMPATIBILITY_WEIGHT = 0.85
const BUNDLING_WEIGHT = 0.15
const NEIGHBOR_RADIUS = 80

/**
 * Returns subdivision points for a straight line from (sx,sy) to (tx,ty).
 * Includes endpoints; inner points are evenly spaced.
 */
function subdivide(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  n: number
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    points.push({
      x: sx + (tx - sx) * t,
      y: sy + (ty - sy) * t,
    })
  }
  return points
}

/**
 * Compatibility position: point on the straight line for edge at parameter t.
 */
function compatibilityPos(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  t: number
): { x: number; y: number } {
  return {
    x: sx + (tx - sx) * t,
    y: sy + (ty - sy) * t,
  }
}

/**
 * Build smooth SVG path through points: Catmull-Rom–style cubic segments
 * so the curve passes through each point.
 */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return ''
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
  }
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`
  }
  return d
}

/**
 * Compute force-directed bundled paths for the given edges.
 * Returns a map from edge id to SVG path string.
 */
export function computeBundledPaths(edges: EdgeSegment[]): Map<string, string> {
  if (edges.length === 0) return new Map()

  const n = SUBDIVISIONS
  const pointsByEdge: { id: string; pts: { x: number; y: number }[]; sx: number; sy: number; tx: number; ty: number }[] = edges.map(
    (e) => ({
      id: e.id,
      sx: e.sourceX,
      sy: e.sourceY,
      tx: e.targetX,
      ty: e.targetY,
      pts: subdivide(e.sourceX, e.sourceY, e.targetX, e.targetY, n),
    })
  )

  for (let iter = 0; iter < ITERATIONS; iter++) {
    for (let ei = 0; ei < pointsByEdge.length; ei++) {
      const edge = pointsByEdge[ei]
      const { pts, sx, sy, tx, ty } = edge
      for (let i = 1; i < n; i++) {
        const t = i / n
        const compat = compatibilityPos(sx, sy, tx, ty, t)
        let sumX = 0
        let sumY = 0
        let count = 0
        for (let ej = 0; ej < pointsByEdge.length; ej++) {
          if (ej === ei) continue
          const other = pointsByEdge[ej].pts[i]
          const dx = pts[i].x - other.x
          const dy = pts[i].y - other.y
          const dist = Math.hypot(dx, dy)
          if (dist < NEIGHBOR_RADIUS && dist > 1e-6) {
            sumX += other.x
            sumY += other.y
            count++
          }
        }
        const bundleX = count > 0 ? sumX / count : pts[i].x
        const bundleY = count > 0 ? sumY / count : pts[i].y
        pts[i].x =
          COMPATIBILITY_WEIGHT * compat.x + BUNDLING_WEIGHT * bundleX
        pts[i].y =
          COMPATIBILITY_WEIGHT * compat.y + BUNDLING_WEIGHT * bundleY
      }
    }
  }

  const result = new Map<string, string>()
  pointsByEdge.forEach(({ id, pts }) => {
    result.set(id, smoothPath(pts))
  })
  return result
}
