import dagre from '@dagrejs/dagre'
import { type Node, Position } from '@xyflow/react'

/** Default node dimensions used when getNodeSize is not provided. Sized to avoid overlap with degree-based nodes (max ~150x60). */
const NODE_WIDTH = 180
const NODE_HEIGHT = 70
const LAYOUT_PADDING = 50

const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}))

/**
 * Returns a spacing scale in [0.5, 1] based on node count so small graphs (e.g. folder view)
 * get tighter layout and don't look overly separated.
 */
function getSpacingScale(nodeCount: number): number {
  if (nodeCount <= 0) return 1
  if (nodeCount <= 8) return 0.5
  if (nodeCount <= 20) return 0.5 + (nodeCount - 8) / 24 // 0.5 -> 1 over 8..20
  return 1
}

export interface LayoutEdge {
  source: string
  target: string
}

interface DagreOptions {
  ranker?: 'network-simplex' | 'tight-tree' | 'longest-path'
  nodesep?: number
  ranksep?: number
}

export type GetNodeSize = (node: Node) => { width: number; height: number }

/**
 * Applies dagre layout (hierarchical). Used for cola, breadthfirst, and tree.
 * When getNodeSize is provided, uses per-node dimensions to avoid overlap.
 * Spacing scales down for small graphs (folder view) so nodes don't look overly separated.
 */
function layoutDagre(
  nodes: Node[],
  edges: LayoutEdge[],
  direction: 'TB' | 'LR' = 'TB',
  options: DagreOptions = {},
  getNodeSize?: GetNodeSize
): Node[] {
  const scale = getSpacingScale(nodes.length)
  const { ranker = 'network-simplex', nodesep = 40, ranksep = 90 } = options
  dagreGraph.setGraph({
    rankdir: direction,
    ranker,
    nodesep: nodesep * scale,
    ranksep: ranksep * scale,
    marginx: LAYOUT_PADDING * scale,
    marginy: LAYOUT_PADDING * scale,
  })

  const getSize = getNodeSize ?? (() => ({ width: NODE_WIDTH, height: NODE_HEIGHT }))
  nodes.forEach((node) => {
    const { width, height } = getSize(node)
    dagreGraph.setNode(node.id, { width, height })
  })

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target)
  })

  dagre.layout(dagreGraph)

  const isHorizontal = direction === 'LR'
  return nodes.map((node) => {
    const pos = dagreGraph.node(node.id)
    const { width, height } = getSize(node)
    return {
      ...node,
      position: {
        x: pos.x - width / 2,
        y: pos.y - height / 2,
      },
      ...(isHorizontal
        ? { sourcePosition: Position.Right, targetPosition: Position.Left }
        : { sourcePosition: Position.Bottom, targetPosition: Position.Top }),
    }
  })
}

/**
 * Places nodes on a circle. Radius scales with node count; smaller graphs get tighter radius.
 */
function layoutCircle(nodes: Node[], getNodeSize?: GetNodeSize): Node[] {
  const n = nodes.length
  if (n === 0) return nodes
  const scale = getSpacingScale(n)
  const getSize = getNodeSize ?? (() => ({ width: NODE_WIDTH, height: NODE_HEIGHT }))
  const maxDim = Math.max(
    ...nodes.map((node) => {
      const { width, height } = getSize(node)
      return Math.max(width, height)
    })
  )
  const baseRadius = Math.max(120, (n * (maxDim + 24)) / (2 * Math.PI))
  const radius = baseRadius * scale
  const centerX = 400
  const centerY = 300
  return nodes.map((node, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2
    const { width, height } = getSize(node)
    return {
      ...node,
      position: {
        x: centerX + radius * Math.cos(angle) - width / 2,
        y: centerY + radius * Math.sin(angle) - height / 2,
      },
    }
  })
}

const GRID_GAP = 36

/**
 * Places nodes in a grid. Max 6 columns (or colsOverride). Spacing scales down for small graphs.
 */
function layoutGrid(nodes: Node[], getNodeSize?: GetNodeSize, colsOverride?: number): Node[] {
  const n = nodes.length
  if (n === 0) return nodes
  const scale = getSpacingScale(n)
  const gap = Math.round(GRID_GAP * scale)
  const padding = Math.round(LAYOUT_PADDING * scale)
  const getSize = getNodeSize ?? (() => ({ width: NODE_WIDTH, height: NODE_HEIGHT }))
  const cols =
    colsOverride !== undefined
      ? Math.max(1, colsOverride)
      : Math.max(1, Math.min(6, Math.ceil(Math.sqrt(n))))
  const colWidths: number[] = []
  const rowHeights: number[] = []
  nodes.forEach((node, i) => {
    const { width, height } = getSize(node)
    const col = i % cols
    const row = Math.floor(i / cols)
    colWidths[col] = Math.max(colWidths[col] ?? 0, width)
    rowHeights[row] = Math.max(rowHeights[row] ?? 0, height)
  })
  let x = padding
  const colOffsets = Array.from({ length: cols }, (_, col) => {
    const offset = x
    x += (colWidths[col] ?? NODE_WIDTH) + gap
    return offset
  })
  let y = padding
  const rowOffsets: number[] = []
  for (let row = 0; row < Math.ceil(n / cols); row++) {
    rowOffsets[row] = y
    y += (rowHeights[row] ?? NODE_HEIGHT) + gap
  }
  return nodes.map((node, i) => {
    const row = Math.floor(i / cols)
    const col = i % cols
    return {
      ...node,
      position: {
        x: colOffsets[col],
        y: rowOffsets[row],
      },
    }
  })
}

/**
 * Places nodes in a tall grid (fixed 4 columns). Uses per-node or default size for spacing.
 */
function layoutGridTall(nodes: Node[], getNodeSize?: GetNodeSize): Node[] {
  return layoutGrid(nodes, getNodeSize, 4)
}

/**
 * Places nodes in concentric rings by degree. Spacing scales down for small graphs.
 */
function layoutConcentric(
  nodes: Node[],
  edges: LayoutEdge[],
  getNodeSize?: GetNodeSize
): Node[] {
  const n = nodes.length
  if (n === 0) return nodes

  const scale = getSpacingScale(n)
  const getSize = getNodeSize ?? (() => ({ width: NODE_WIDTH, height: NODE_HEIGHT }))

  const degreeById = new Map<string, number>()
  nodes.forEach((node) => degreeById.set(node.id, 0))
  edges.forEach((e) => {
    degreeById.set(e.source, (degreeById.get(e.source) ?? 0) + 1)
    degreeById.set(e.target, (degreeById.get(e.target) ?? 0) + 1)
  })

  const byDegree = new Map<number, Node[]>()
  nodes.forEach((node) => {
    const d = degreeById.get(node.id) ?? 0
    if (!byDegree.has(d)) byDegree.set(d, [])
    byDegree.get(d)!.push(node)
  })
  const sortedDegrees = [...byDegree.keys()].sort((a, b) => a - b)

  const centerX = 400
  const centerY = 300
  const ringGap = 100 * scale
  let baseRadius = 80 * scale

  const result: Node[] = []
  sortedDegrees.forEach((degree) => {
    const ringNodes = byDegree.get(degree)!
    const ringRadius = baseRadius
    const maxDimInRing = Math.max(
      ...ringNodes.map((node) => Math.max(getSize(node).width, getSize(node).height))
    )
    baseRadius += maxDimInRing + ringGap
    ringNodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / ringNodes.length - Math.PI / 2
      const { width, height } = getSize(node)
      result.push({
        ...node,
        position: {
          x: centerX + ringRadius * Math.cos(angle) - width / 2,
          y: centerY + ringRadius * Math.sin(angle) - height / 2,
        },
      })
    })
  })
  return result
}

export type LayoutName =
  | 'cola'
  | 'circle'
  | 'grid'
  | 'grid-tall'
  | 'breadthfirst'
  | 'tree'
  | 'concentric'

/**
 * Returns React Flow nodes with positions set according to layoutName.
 * When getNodeSize is provided, layouts use per-node dimensions to avoid overlap.
 * Edges are unchanged (pass-through).
 */
export function getLayoutedNodes(
  nodes: Node[],
  edges: LayoutEdge[],
  layoutName: LayoutName,
  getNodeSize?: GetNodeSize
): Node[] {
  switch (layoutName) {
    case 'cola':
    case 'breadthfirst':
      return layoutDagre(nodes, edges, 'TB', { ranker: 'tight-tree', nodesep: 40, ranksep: 90 }, getNodeSize)
    case 'tree':
      return layoutDagre(nodes, edges, 'TB', { ranker: 'tight-tree', nodesep: 32, ranksep: 70 }, getNodeSize)
    case 'circle':
      return layoutCircle(nodes, getNodeSize)
    case 'grid':
      return layoutGrid(nodes, getNodeSize)
    case 'grid-tall':
      return layoutGridTall(nodes, getNodeSize)
    case 'concentric':
      return layoutConcentric(nodes, edges, getNodeSize)
    default:
      return layoutDagre(nodes, edges, 'TB', { ranker: 'tight-tree', nodesep: 40, ranksep: 90 }, getNodeSize)
  }
}
