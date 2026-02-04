// Shared palette and helpers for graph nodes (React Flow ModuleNode).

import type { LabelFontSize, NodeBorderWidth } from '@/stores/graphStore'
import type { HeatmapMode } from '@/stores/graphStore'
import type { Node as ApiNode } from '@/types/api'

export const NODE_COLOR_PALETTE = [
  '#6366f1', '#818cf8', '#a5b4fc', '#6366f1', '#4f46e5',
  '#7c3aed', '#8b5cf6', '#a78bfa', '#0d9488', '#14b8a6',
  '#06b6d4', '#0891b2', '#0284c7', '#2563eb', '#3b82f6',
  '#475569', '#64748b', '#94a3b8', '#0f766e', '#0d9488',
  '#0e7490', '#0369a1', '#1d4ed8', '#5b21b6', '#6d28d9',
]

export function nodeColorForId(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h) + id.charCodeAt(i) | 0
  const idx = Math.abs(h) % NODE_COLOR_PALETTE.length
  return NODE_COLOR_PALETTE[idx]
}

/** Returns [lighter, darker] hex colors for gradient (top-left to bottom-right). */
export function gradientStopsForHex(hex: string): [string, string] {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 0xff
  const g = (n >> 8) & 0xff
  const b = n & 0xff
  const lighten = (c: number) => Math.min(255, Math.round(c * 1.12))
  const darken = (c: number) => Math.max(0, Math.round(c * 0.88))
  const toHex = (r: number, g: number, b: number) =>
    '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return [
    toHex(lighten(r), lighten(g), lighten(b)),
    toHex(darken(r), darken(g), darken(b)),
  ]
}

export const LABEL_FONT_SIZE_MAP: Record<LabelFontSize, string> = {
  small: '10px',
  medium: '12px',
  large: '14px',
}

export const NODE_BORDER_WIDTH_MAP: Record<NodeBorderWidth, number> = {
  thin: 1,
  normal: 2,
  thick: 3,
}

// --- Heatmap (refactor hotspots) ---

export type HeatmapMetric =
  | 'import_count'
  | 'imported_by_count'
  | 'pagerank'
  | 'betweenness'

export function metricForMode(mode: HeatmapMode): HeatmapMetric | null {
  switch (mode) {
    case 'god_fanout':
      return 'import_count'
    case 'god_fanin':
      return 'imported_by_count'
    case 'impact_pagerank':
      return 'pagerank'
    case 'impact_betweenness':
      return 'betweenness'
    case 'off':
      return null
  }
}

export function heatFromMetric(
  nodes: ApiNode[],
  metric: HeatmapMetric
): Map<string, number> {
  const internal = nodes.filter((n) => n.node_type !== 'external')
  if (internal.length === 0) return new Map()

  const values = internal.map((n) => {
    const v = metric === 'import_count' ? n.import_count
      : metric === 'imported_by_count' ? n.imported_by_count
      : metric === 'pagerank' ? n.pagerank
      : n.betweenness
    return typeof v === 'number' && Number.isFinite(v) ? v : 0
  })
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min
  const out = new Map<string, number>()
  internal.forEach((n, i) => {
    const raw = values[i]!
    const heat = range === 0 ? 0 : (raw - min) / range
    out.set(n.id, Math.max(0, Math.min(1, heat)))
  })
  return out
}

/** Map heat in [0, 1] to hex color: green (low) -> yellow/amber -> red (high). */
export function heatToColor(heat: number, isDark?: boolean): string {
  const t = Math.max(0, Math.min(1, heat))
  // Green #22c55e (0) -> Amber #f59e0b (0.5) -> Red #ef4444 (1)
  const lerp = (a: number, b: number, x: number) => a + (b - a) * x
  let r: number, g: number, b: number
  if (t < 0.5) {
    const u = t * 2
    r = Math.round(lerp(0x22, 0xf5, u))
    g = Math.round(lerp(0xc5, 0x9e, u))
    b = Math.round(lerp(0x5e, 0x0b, u))
  } else {
    const u = (t - 0.5) * 2
    r = Math.round(lerp(0xf5, 0xef, u))
    g = Math.round(lerp(0x9e, 0x44, u))
    b = Math.round(lerp(0x0b, 0x44, u))
  }
  if (isDark) {
    r = Math.min(255, Math.round(r * 1.1))
    g = Math.min(255, Math.round(g * 1.1))
    b = Math.min(255, Math.round(b * 1.1))
  }
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')
}
