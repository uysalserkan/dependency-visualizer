import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { Settings } from 'lucide-react'
import { DirectionEdge } from './edges/DirectionEdge'
import type { AnalysisResult, Node as ApiNode, Edge as ApiEdge, FileBlameResponse } from '@/types/api'
import { getRelativePath, isUnderFolder } from '@/lib/pathUtils'
import { getLayoutedNodes, type LayoutName } from '@/lib/graphLayout'
import { metricForMode, heatFromMetric } from '@/lib/graphNodeUtils'
import { api } from '@/lib/api'
import { computeBundledPaths } from '@/lib/edgeBundling'
import { EdgeBundlingContext } from '@/contexts/EdgeBundlingContext'
import {
  getEffectiveNodesAndEdges,
  getFolderPath,
  isClusterNode,
  CLUSTER_ID_PREFIX,
} from '@/lib/folderGroups'
import { ClusterNode } from './nodes/ClusterNode'

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

const nodeTypes = { module: ModuleNode, cluster: ClusterNode }
const edgeTypes = { direction: DirectionEdge }

interface GraphVisualizationProps {
  analysis: AnalysisResult
  onOpenSettings?: () => void
}

function isLocalProjectPath(projectPath: string): boolean {
  return !projectPath.startsWith('http://') && !projectPath.startsWith('https://')
}

function GraphFlow({
  analysis,
  filteredNodes,
  filteredEdges,
  effectiveNodes,
  effectiveEdges,
  onOpenSettings,
}: {
  analysis: AnalysisResult
  filteredNodes: ApiNode[]
  filteredEdges: ApiEdge[]
  effectiveNodes: import('@/lib/folderGroups').EffectiveNode[]
  effectiveEdges: import('@/lib/folderGroups').EffectiveEdge[]
  onOpenSettings?: () => void
}) {
  const nodeById = useMemo(
    () =>
      new Map(
        effectiveNodes
          .filter((n): n is ApiNode => !isClusterNode(n))
          .map((n) => [n.id, n])
      ),
    [effectiveNodes]
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
    edgeCurveStyle,
    collapsedFolders,
  } = useGraphStore()

  const blameAvailable = isLocalProjectPath(analysis.project_path)
  const [hoveredBlameNode, setHoveredBlameNode] = useState<{
    nodeId: string
    filePath: string
    x: number
    y: number
  } | null>(null)
  const [blameData, setBlameData] = useState<FileBlameResponse | null>(null)
  const [blameError, setBlameError] = useState<string | null>(null)
  const blameDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoveredBlameKeyRef = useRef<{ nodeId: string; filePath: string } | null>(null)

  /** Mirrors ModuleNode size formula; cluster nodes use fixed size. */
  const getNodeSize = useCallback(
    (node: Node): { width: number; height: number } => {
      if (node.type === 'cluster' || node.id.startsWith(CLUSTER_ID_PREFIX)) {
        return { width: 140, height: 44 }
      }
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
    effectiveNodes.forEach((n) => m.set(n.id, 0))
    effectiveEdges.forEach((e) => {
      m.set(e.source, (m.get(e.source) ?? 0) + 1)
      m.set(e.target, (m.get(e.target) ?? 0) + 1)
    })
    return m
  }, [effectiveNodes, effectiveEdges])

  const heatByNodeId = useMemo(() => {
    const metric = metricForMode(heatmapMode)
    if (!metric) return null
    return heatFromMetric(filteredNodes, metric)
  }, [filteredNodes, heatmapMode])

  const effectiveLayoutEdges = useMemo(
    () => effectiveEdges.map((e) => ({ source: e.source, target: e.target })),
    [effectiveEdges]
  )

  const initialNodes = useMemo(() => {
    const rfNodes: Node[] = effectiveNodes.map((n) => {
      if (isClusterNode(n)) {
        return {
          id: n.id,
          position: { x: 0, y: 0 },
          data: { folderPath: n.folderPath, label: n.label, nodeCount: n.nodeCount },
          type: 'cluster' as const,
        }
      }
      return {
        id: n.id,
        position: { x: 0, y: 0 },
        data: {
          label: n.label,
          file_path: n.file_path,
          node_type: n.node_type,
          external_kind: n.external_kind,
          degree: degreeByNodeId.get(n.id) ?? 0,
          ...(n.commit_hash != null ? { commit_hash: n.commit_hash } : {}),
          ...(heatByNodeId ? { heat: heatByNodeId.get(n.id) ?? undefined } : {}),
        },
        type: 'module' as const,
      }
    })
    return getLayoutedNodes(rfNodes, effectiveLayoutEdges, layoutName as LayoutName, getNodeSize)
  }, [effectiveNodes, layoutName, degreeByNodeId, getNodeSize, heatByNodeId, effectiveLayoutEdges])

  const initialEdges = useMemo((): Edge[] => {
    return effectiveEdges.map((e) => ({
      id: `${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      type: 'direction',
      data: e.count != null && e.count > 1 ? { count: e.count } : {},
      markerEnd: { type: MarkerType.ArrowClosed },
    }))
  }, [effectiveEdges])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => {
    const rfNodes: Node[] = effectiveNodes.map((n) => {
      if (isClusterNode(n)) {
        return {
          id: n.id,
          position: { x: 0, y: 0 },
          data: { folderPath: n.folderPath, label: n.label, nodeCount: n.nodeCount },
          type: 'cluster' as const,
        }
      }
      return {
        id: n.id,
        position: { x: 0, y: 0 },
        data: {
          label: n.label,
          file_path: n.file_path,
          node_type: n.node_type,
          external_kind: n.external_kind,
          degree: degreeByNodeId.get(n.id) ?? 0,
          ...(n.commit_hash != null ? { commit_hash: n.commit_hash } : {}),
          ...(heatByNodeId ? { heat: heatByNodeId.get(n.id) ?? undefined } : {}),
        },
        type: 'module' as const,
      }
    })
    const layouted = getLayoutedNodes(rfNodes, effectiveLayoutEdges, layoutName as LayoutName, getNodeSize)
    setNodes(layouted)
    setEdges(
      effectiveEdges.map((e) => ({
        id: `${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        type: 'direction',
        data: e.count != null && e.count > 1 ? { count: e.count } : {},
        markerEnd: { type: MarkerType.ArrowClosed },
      }))
    )
  }, [effectiveNodes, effectiveEdges, effectiveLayoutEdges, layoutName, degreeByNodeId, getNodeSize, heatByNodeId, setNodes, setEdges])

  const bundledPaths = useMemo(() => {
    if (edgeCurveStyle !== 'bundled') return null
    const segments = edges
      .map((e) => {
        const sn = nodes.find((n) => n.id === e.source)
        const tn = nodes.find((n) => n.id === e.target)
        if (!sn || !tn) return null
        const { width: sw, height: sh } = getNodeSize(sn)
        const { width: tw, height: th } = getNodeSize(tn)
        return {
          id: e.id,
          sourceX: sn.position.x + sw / 2,
          sourceY: sn.position.y + sh / 2,
          targetX: tn.position.x + tw / 2,
          targetY: tn.position.y + th / 2,
        }
      })
      .filter((s): s is NonNullable<typeof s> => s != null)
    return computeBundledPaths(segments)
  }, [edgeCurveStyle, nodes, edges, getNodeSize])

  const applyHighlight = useCallback(
    (nodeId: string) => {
      const connectedIds = new Set<string>([nodeId])
      filteredEdges.forEach((e) => {
        if (e.source === nodeId || e.target === nodeId) {
          connectedIds.add(e.source)
          connectedIds.add(e.target)
        }
      })
      const apiNode = nodeById.get(nodeId)
      const clusterIdForSelected =
        apiNode != null
          ? `${CLUSTER_ID_PREFIX}${getFolderPath(getRelativePath(apiNode.file_path, analysis.project_path))}`
          : null
      const isEdgeConnected = (source: string, target: string) =>
        connectedIds.has(source) ||
        connectedIds.has(target) ||
        (clusterIdForSelected != null &&
          (source === clusterIdForSelected || target === clusterIdForSelected))
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
            dimmed: !isEdgeConnected(e.source, e.target),
          },
        }))
      )
    },
    [analysis.project_path, filteredEdges, nodeById, setNodes, setEdges]
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
      if (node.type === 'cluster') {
        setSelectedNode(null)
        clearHighlight()
        return
      }
      setSelectedNode(nodeById.get(node.id) ?? null)
      applyHighlight(node.id)
    },
    [setSelectedNode, nodeById, applyHighlight, clearHighlight]
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
    const folderPath = getFolderPath(getRelativePath(selectedNode.file_path, analysis.project_path))
    const focusNodeId =
      collapsedFolders.includes(folderPath) ? `${CLUSTER_ID_PREFIX}${folderPath}` : selectedNode.id
    setTimeout(() => {
      fitView({
        nodes: [{ id: focusNodeId }],
        padding: 0.3,
        duration: 500,
        maxZoom: 1.5,
      })
    }, 0)
  }, [selectedNode?.id, selectedNode?.file_path, analysis.project_path, collapsedFolders, applyHighlight, clearHighlight, fitView])

  const onNodeMouseEnter = useCallback(
    (ev: React.MouseEvent, node: Node) => {
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

      const apiNode = nodeById.get(node.id)
      const filePath = (node.data?.file_path as string) ?? apiNode?.file_path
      const isInternal = (node.data?.node_type as string) !== 'external' && (apiNode?.node_type !== 'external')
      if (blameAvailable && isInternal && filePath) {
        if (blameDelayRef.current) {
          clearTimeout(blameDelayRef.current)
          blameDelayRef.current = null
        }
        setBlameData(null)
        setBlameError(null)
        const nodeId = node.id
        const x = ev.clientX
        const y = ev.clientY
        setHoveredBlameNode({ nodeId, filePath, x, y })
        hoveredBlameKeyRef.current = { nodeId, filePath }
        blameDelayRef.current = setTimeout(() => {
          blameDelayRef.current = null
          api.getBlame(analysis.id, filePath).then(
            (data) => {
              if (hoveredBlameKeyRef.current?.nodeId === nodeId && hoveredBlameKeyRef.current?.filePath === filePath) {
                setBlameData(data)
                setBlameError(null)
              }
            },
            (err: Error) => {
              if (hoveredBlameKeyRef.current?.nodeId === nodeId && hoveredBlameKeyRef.current?.filePath === filePath) {
                setBlameError(err.message ?? 'Could not load blame')
                setBlameData(null)
              }
            }
          )
        }, 300)
      } else {
        setHoveredBlameNode(null)
        hoveredBlameKeyRef.current = null
      }
    },
    [analysis.id, blameAvailable, filteredEdges, nodeById, setNodes, setEdges]
  )

  const onNodeMouseLeave = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((n) => ({ ...n, data: { ...n.data, hovered: false } }))
    )
    setEdges((edges) =>
      edges.map((e) => ({ ...e, data: { ...e.data, hovered: false } }))
    )
    if (blameDelayRef.current) {
      clearTimeout(blameDelayRef.current)
      blameDelayRef.current = null
    }
    setHoveredBlameNode(null)
    setBlameData(null)
    setBlameError(null)
    hoveredBlameKeyRef.current = null
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

  const tooltipOffset = 12
  const showTooltip = hoveredBlameNode !== null
  const tooltipLoading = showTooltip && blameData === null && blameError === null
  const tooltipSuccess = showTooltip && blameData !== null
  const tooltipError = showTooltip && blameError !== null
  const hoveredApiNode = hoveredBlameNode ? nodeById.get(hoveredBlameNode.nodeId) : null
  const hoveredRfNode = hoveredBlameNode ? nodes.find((n) => n.id === hoveredBlameNode.nodeId) : null
  const tooltipCommitHash =
    blameData?.commit_hash ??
    hoveredApiNode?.commit_hash ??
    (hoveredRfNode?.data?.commit_hash as string | undefined) ??
    null

  return (
    <>
      <EdgeBundlingContext.Provider value={{ bundledPaths }}>
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
        <Panel position="top-right">
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl shadow-lg hover:bg-gray-100 dark:hover:bg-slate-800/80 transition-colors"
              aria-label="Open settings"
              title="Settings"
            >
              <Settings className="w-4 h-4 text-gray-600 dark:text-slate-400" aria-hidden />
            </button>
          )}
        </Panel>
        <Panel position="bottom-center">
          <GraphFloatingControls />
        </Panel>
      </ReactFlow>
      </EdgeBundlingContext.Provider>
      {showTooltip && hoveredBlameNode && (
        <div
          role="tooltip"
          aria-label={
            tooltipCommitHash
              ? `Last commit ${tooltipCommitHash}${blameData ? ` by ${blameData.author_name}: ${blameData.subject}` : ''}`
              : tooltipError
                ? blameError ?? 'Could not load blame'
                : 'Loading blame…'
          }
          className="pointer-events-none fixed z-[1000] max-w-sm rounded-lg border border-gray-200 bg-white/95 px-3 py-2 text-left shadow-lg backdrop-blur dark:border-white/10 dark:bg-slate-800/95"
          style={{
            left: hoveredBlameNode.x + tooltipOffset,
            top: hoveredBlameNode.y + tooltipOffset,
          }}
        >
          {tooltipLoading && !tooltipCommitHash && (
            <p className="text-xs text-gray-500 dark:text-slate-400">Loading…</p>
          )}
          {(tooltipCommitHash || tooltipSuccess) && (
            <div className="space-y-1 text-xs">
              {tooltipCommitHash ? (
                <p
                  className="font-mono-ui text-gray-600 dark:text-slate-400"
                  title={tooltipCommitHash}
                >
                  Commit: {tooltipCommitHash.slice(0, 7)}
                </p>
              ) : null}
              {tooltipSuccess && blameData && (
                <>
                  <p className="font-medium text-gray-800 dark:text-slate-200">
                    {blameData.author_name}
                    {blameData.author_email ? (
                      <span className="ml-1 font-normal text-gray-500 dark:text-slate-400">
                        ({blameData.author_email})
                      </span>
                    ) : null}
                  </p>
                  {blameData.date ? (
                    <p className="text-gray-500 dark:text-slate-400">{blameData.date}</p>
                  ) : null}
                  <p
                    className="line-clamp-3 text-gray-700 dark:text-slate-300"
                    title={blameData.subject}
                  >
                    {blameData.subject}
                  </p>
                </>
              )}
            </div>
          )}
          {tooltipError && !tooltipCommitHash && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {blameError}
            </p>
          )}
        </div>
      )}
    </>
  )
}

export function GraphVisualization({ analysis, onOpenSettings }: GraphVisualizationProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const setFlowWrapperRef = useGraphStore((s) => s.setFlowWrapperRef)
  const isDark = useThemeStore((s) => s.isDark)
  const graphBackground = useGraphStore((s) => s.graphBackground)
  const { selectedFolderPath, showStdlibNodes, showExternalPackages, collapsedFolders } =
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

  const { nodes: effectiveNodes, edges: effectiveEdges } = useMemo(
    () =>
      getEffectiveNodesAndEdges(
        filteredNodes,
        filteredEdges,
        analysis.project_path,
        new Set(collapsedFolders)
      ),
    [filteredNodes, filteredEdges, analysis.project_path, collapsedFolders]
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
          analysis={analysis}
          filteredNodes={filteredNodes}
          filteredEdges={filteredEdges}
          effectiveNodes={effectiveNodes}
          effectiveEdges={effectiveEdges}
          onOpenSettings={onOpenSettings}
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
