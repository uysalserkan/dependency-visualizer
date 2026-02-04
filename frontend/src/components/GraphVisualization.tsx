import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  Background,
  MarkerType,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useGraphStore } from '@/stores/graphStore'
import { useThemeStore } from '@/stores/themeStore'
import { GraphFloatingControls } from './GraphFloatingControls'
import { ModuleNode } from './nodes/ModuleNode'
import { DirectionEdge } from './edges/DirectionEdge'
import type { AnalysisResult, Node as ApiNode, Edge as ApiEdge } from '@/types/api'
import { getRelativePath, isUnderFolder } from '@/lib/pathUtils'
import { getLayoutedNodes, type LayoutName } from '@/lib/graphLayout'
import { metricForMode, heatFromMetric } from '@/lib/graphNodeUtils'

export function filterNodesAndEdgesByFolder(
  analysis: AnalysisResult,
  selectedFolderPath: string | null,
  showStdlibNodes: boolean,
  showExternalPackages: boolean
): { nodes: ApiNode[]; edges: ApiEdge[] } {
  const projectPath = analysis.project_path

  let internalNodes: ApiNode[]
  if (!selectedFolderPath) {
    internalNodes = analysis.nodes.filter((n) => n.node_type !== 'external')
  } else {
    internalNodes = analysis.nodes.filter((n) => {
      if (n.node_type === 'external') return false
      const relative = getRelativePath(n.file_path, projectPath)
      return isUnderFolder(relative, selectedFolderPath)
    })
  }

  const internalIds = new Set(internalNodes.map((n) => n.id))
  let externalNodes: ApiNode[] = []
  if (showStdlibNodes || showExternalPackages) {
    externalNodes = analysis.nodes.filter((n) => {
      if (n.node_type !== 'external') return false
      const kind = n.external_kind ?? 'package'
      if (kind === 'stdlib' && !showStdlibNodes) return false
      if (kind === 'package' && !showExternalPackages) return false
      const connected = analysis.edges.some(
        (e) =>
          (e.source === n.id && internalIds.has(e.target)) ||
          (e.target === n.id && internalIds.has(e.source))
      )
      return connected
    })
  }

  const nodes = [...internalNodes, ...externalNodes]
  const nodeIds = new Set(nodes.map((n) => n.id))
  const edges = analysis.edges.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
  )
  return { nodes, edges }
}

const nodeTypes = { module: ModuleNode }
const edgeTypes = { direction: DirectionEdge }

interface GraphVisualizationProps {
  analysis: AnalysisResult
}

function GraphFlow({
  filteredNodes,
  filteredEdges,
}: {
  filteredNodes: ApiNode[]
  filteredEdges: ApiEdge[]
}) {
  const nodeById = useMemo(
    () => new Map(filteredNodes.map((n) => [n.id, n])),
    [filteredNodes]
  )
  const {
    setSelectedNode,
    layoutName,
    layoutAnimation,
    fitRequest,
    searchQuery,
    selectedNode,
    nodeSizeMode,
    nodeShape,
    heatmapMode,
  } = useGraphStore()

  /** Mirrors ModuleNode size formula so layout spacing matches rendered node dimensions. */
  const getNodeSize = useCallback(
    (node: Node): { width: number; height: number } => {
      const degree = (node.data?.degree as number) ?? 0
      const size =
        nodeSizeMode === 'fixed' ? 40 : Math.max(30, Math.min(60, 30 + degree * 2))
      if (nodeShape === 'diamond') {
        const dim = size * 1.2
        return { width: dim, height: dim }
      }
      return { width: size * 2.5, height: size }
    },
    [nodeSizeMode, nodeShape]
  )

  const degreeByNodeId = useMemo(() => {
    const m = new Map<string, number>()
    filteredNodes.forEach((n) => m.set(n.id, 0))
    filteredEdges.forEach((e) => {
      m.set(e.source, (m.get(e.source) ?? 0) + 1)
      m.set(e.target, (m.get(e.target) ?? 0) + 1)
    })
    return m
  }, [filteredNodes, filteredEdges])

  const heatByNodeId = useMemo(() => {
    const metric = metricForMode(heatmapMode)
    if (!metric) return null
    return heatFromMetric(filteredNodes, metric)
  }, [filteredNodes, heatmapMode])

  const initialNodes = useMemo(() => {
    const rfNodes: Node[] = filteredNodes.map((n) => ({
      id: n.id,
      position: { x: 0, y: 0 },
      data: {
        label: n.label,
        file_path: n.file_path,
        node_type: n.node_type,
        external_kind: n.external_kind,
        degree: degreeByNodeId.get(n.id) ?? 0,
        ...(heatByNodeId ? { heat: heatByNodeId.get(n.id) ?? undefined } : {}),
      },
      type: 'module',
    }))
    return getLayoutedNodes(rfNodes, filteredEdges, layoutName as LayoutName, getNodeSize)
  }, [filteredNodes, filteredEdges, layoutName, degreeByNodeId, getNodeSize, heatByNodeId])

  const initialEdges = useMemo((): Edge[] => {
    return filteredEdges.map((e) => ({
      id: `${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      type: 'direction',
      data: {},
      markerEnd: { type: MarkerType.ArrowClosed },
    }))
  }, [filteredEdges])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => {
    const rfNodes: Node[] = filteredNodes.map((n) => ({
      id: n.id,
      position: { x: 0, y: 0 },
      data: {
        label: n.label,
        file_path: n.file_path,
        node_type: n.node_type,
        external_kind: n.external_kind,
        degree: degreeByNodeId.get(n.id) ?? 0,
        ...(heatByNodeId ? { heat: heatByNodeId.get(n.id) ?? undefined } : {}),
      },
      type: 'module',
    }))
    const layouted = getLayoutedNodes(rfNodes, filteredEdges, layoutName as LayoutName, getNodeSize)
    setNodes(layouted)
    setEdges(
      filteredEdges.map((e) => ({
        id: `${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        type: 'direction',
        data: {},
        markerEnd: { type: MarkerType.ArrowClosed },
      }))
    )
  }, [filteredNodes, filteredEdges, layoutName, degreeByNodeId, getNodeSize, heatByNodeId, setNodes, setEdges])

  const applyHighlight = useCallback(
    (nodeId: string) => {
      const connectedIds = new Set<string>([nodeId])
      filteredEdges.forEach((e) => {
        if (e.source === nodeId || e.target === nodeId) {
          connectedIds.add(e.source)
          connectedIds.add(e.target)
        }
      })
      setNodes((nodes) =>
        nodes.map((n) => ({
          ...n,
          data: {
            ...n.data,
            highlighted: connectedIds.has(n.id),
            dimmed: !connectedIds.has(n.id),
            hovered: false,
          },
        }))
      )
      setEdges((edges) =>
        edges.map((e) => ({
          ...e,
          data: {
            edgeType:
              e.source === nodeId ? ('out' as const) : e.target === nodeId ? ('in' as const) : undefined,
            dimmed: !(connectedIds.has(e.source) && connectedIds.has(e.target)),
          },
        }))
      )
    },
    [filteredEdges, setNodes, setEdges]
  )

  const clearHighlight = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((n) => ({
        ...n,
        data: { ...n.data, highlighted: false, dimmed: false, hovered: false },
      }))
    )
    setEdges((edges) =>
      edges.map((e) => ({
        ...e,
        data: { ...e.data, dimmed: false, edgeType: undefined, hovered: false },
      }))
    )
  }, [setNodes, setEdges])

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(nodeById.get(node.id) ?? null)
      applyHighlight(node.id)
    },
    [setSelectedNode, nodeById, applyHighlight]
  )

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      setSelectedNode(nodeById.get(edge.target) ?? null)
      applyHighlight(edge.target)
    },
    [setSelectedNode, nodeById, applyHighlight]
  )

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
    clearHighlight()
  }, [setSelectedNode, clearHighlight])

  const { fitView } = useReactFlow()

  useEffect(() => {
    if (!searchQuery.trim()) {
      clearHighlight()
      return
    }
    const q = searchQuery.toLowerCase()
    const matchingIds = filteredNodes
      .filter(
        (n) =>
          n.label.toLowerCase().includes(q) ||
          n.file_path.toLowerCase().includes(q)
      )
      .map((n) => n.id)
    setNodes((nodes) =>
      nodes.map((n) => {
        const match = matchingIds.includes(n.id)
        return {
          ...n,
          data: {
            ...n.data,
            dimmed: !match,
            highlighted: match,
          },
        }
      })
    )
    setEdges((edges) =>
      edges.map((e) => ({
        ...e,
        data: { ...e.data, dimmed: true },
      }))
    )
    if (matchingIds.length > 0) {
      setTimeout(() => {
        fitView({
          nodes: matchingIds.map((id) => ({ id })),
          padding: 0.2,
          duration: layoutAnimation ? 300 : 0,
        })
      }, 0)
    }
  }, [searchQuery, filteredNodes, setNodes, setEdges, layoutAnimation, fitView, clearHighlight])

  useEffect(() => {
    if (fitRequest === 0) return
    fitView({ padding: 0.2, duration: layoutAnimation ? 300 : 0 })
  }, [fitRequest, fitView, layoutAnimation])

  const isFullScreen = useGraphStore((s) => s.isFullScreen)
  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.2, duration: 0 }), 100)
    return () => clearTimeout(t)
  }, [filteredNodes.length, isFullScreen])

  useEffect(() => {
    if (!selectedNode) {
      clearHighlight()
      return
    }
    applyHighlight(selectedNode.id)
    setTimeout(() => {
      fitView({
        nodes: [{ id: selectedNode.id }],
        padding: 0.3,
        duration: 500,
        maxZoom: 1.5,
      })
    }, 0)
  }, [selectedNode?.id, applyHighlight, clearHighlight, fitView])

  const onNodeMouseEnter = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setNodes((nodes) =>
        nodes.map((n) => ({
          ...n,
          data: {
            ...n.data,
            hovered: n.id === node.id,
          },
        }))
      )
      const connectedIds = new Set<string>([node.id])
      filteredEdges.forEach((e) => {
        if (e.source === node.id || e.target === node.id) {
          connectedIds.add(e.source)
          connectedIds.add(e.target)
        }
      })
      setEdges((edges) =>
        edges.map((e) => ({
          ...e,
          data: {
            ...e.data,
            hovered:
              connectedIds.has(e.source) && connectedIds.has(e.target),
          },
        }))
      )
    },
    [filteredEdges, setNodes, setEdges]
  )

  const onNodeMouseLeave = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((n) => ({ ...n, data: { ...n.data, hovered: false } }))
    )
    setEdges((edges) =>
      edges.map((e) => ({ ...e, data: { ...e.data, hovered: false } }))
    )
  }, [setNodes, setEdges])

  const onEdgeMouseEnter = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      setNodes((nodes) =>
        nodes.map((n) => ({
          ...n,
          data: {
            ...n.data,
            hovered: n.id === edge.source || n.id === edge.target,
          },
        }))
      )
      setEdges((edges) =>
        edges.map((e) => ({
          ...e,
          data: { ...e.data, hovered: e.id === edge.id },
        }))
      )
    },
    [setNodes, setEdges]
  )

  const onEdgeMouseLeave = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((n) => ({ ...n, data: { ...n.data, hovered: false } }))
    )
    setEdges((edges) =>
      edges.map((e) => ({ ...e, data: { ...e.data, hovered: false } }))
    )
  }, [setNodes, setEdges])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      onEdgeClick={onEdgeClick}
      onPaneClick={onPaneClick}
      onNodeMouseEnter={onNodeMouseEnter}
      onNodeMouseLeave={onNodeMouseLeave}
      onEdgeMouseEnter={onEdgeMouseEnter}
      onEdgeMouseLeave={onEdgeMouseLeave}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{
        padding: 0.2,
        duration: layoutAnimation ? 300 : 0,
      }}
      minZoom={0.1}
      maxZoom={3}
      nodesDraggable={true}
      nodesConnectable={false}
      elementsSelectable={true}
      proOptions={{ hideAttribution: true }}
      className="rounded-xl"
    >
      <Background />
      <Panel position="bottom-center">
        <GraphFloatingControls />
      </Panel>
    </ReactFlow>
  )
}

export function GraphVisualization({ analysis }: GraphVisualizationProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const setFlowWrapperRef = useGraphStore((s) => s.setFlowWrapperRef)
  const isDark = useThemeStore((s) => s.isDark)
  const graphBackground = useGraphStore((s) => s.graphBackground)
  const { selectedFolderPath, showStdlibNodes, showExternalPackages } =
    useGraphStore()

  const { nodes: filteredNodes, edges: filteredEdges } = useMemo(
    () =>
      filterNodesAndEdgesByFolder(
        analysis,
        selectedFolderPath,
        showStdlibNodes,
        showExternalPackages
      ),
    [analysis, selectedFolderPath, showStdlibNodes, showExternalPackages]
  )

  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      wrapperRef.current = el
      setFlowWrapperRef(el)
      // Re-set ref after layout so header Export button sees it (store update after paint)
      if (el) {
        const rafId = requestAnimationFrame(() => {
          setFlowWrapperRef(el)
        })
        return () => cancelAnimationFrame(rafId)
      }
    },
    [setFlowWrapperRef]
  )
  useEffect(() => () => setFlowWrapperRef(null), [setFlowWrapperRef])

  const backgroundClass =
    graphBackground === 'grid'
      ? isDark
        ? 'blueprint-grid'
        : 'blueprint-grid-light'
      : isDark
        ? 'dot-pattern'
        : 'dot-pattern-light'

  const selectedNode = useGraphStore((s) => s.selectedNode)

  return (
    <div
      ref={setRef}
      className={`relative w-full h-full ${backgroundClass}`}
    >
      <ReactFlowProvider>
        <GraphFlow
          filteredNodes={filteredNodes}
          filteredEdges={filteredEdges}
        />
      </ReactFlowProvider>
      {filteredNodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">
            No modules in this folder.
          </p>
        </div>
      )}
      {selectedNode && (
        <div data-skip-export className="absolute bottom-4 left-4 p-3 rounded-xl bg-white/90 dark:bg-slate-900/80 backdrop-blur-md border border-gray-200 dark:border-white/10 shadow-lg z-10">
          <div className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2">
            Edge Colors
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-blue-500 rounded" />
              <span className="text-xs text-gray-500 dark:text-slate-500 font-mono-ui">
                Imports (outgoing, solid)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 border-b-2 border-dashed border-emerald-500 box-border" />
              <span className="text-xs text-gray-500 dark:text-slate-500 font-mono-ui">
                Imported by (incoming, dashed)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
