import { useEffect, useRef, useMemo } from 'react'
import cytoscape, { type Core, type NodeSingular } from 'cytoscape'
// @ts-expect-error - cytoscape-cola has no types
import cola from 'cytoscape-cola'
import { useGraphStore, type EdgeWidthPreset } from '@/stores/graphStore'
import { useThemeStore } from '@/stores/themeStore'
import { GraphFloatingControls } from './GraphFloatingControls'
import type { AnalysisResult } from '@/types/api'

// Register cola layout
cytoscape.use(cola)

// Distinct palette so each node gets a different color (stable by node id)
const NODE_COLOR_PALETTE = [
  '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#ef4444', '#f97316', '#eab308', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c',
  '#ca8a04', '#65a30d', '#059669', '#0891b2', '#0284c7',
]

function nodeColorForId(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h) + id.charCodeAt(i) | 0
  const idx = Math.abs(h) % NODE_COLOR_PALETTE.length
  return NODE_COLOR_PALETTE[idx]
}

const EDGE_WIDTH_MAP: Record<EdgeWidthPreset, number> = { thin: 1, normal: 2, thick: 3 }

interface GraphVisualizationProps {
  analysis: AnalysisResult
}

export function GraphVisualization({ analysis }: GraphVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
  const {
    selectedNode,
    setSelectedNode,
    setCyInstance,
    layoutName,
    showStdlibNodes,
    showExternalPackages,
    searchQuery,
    isFullScreen,
    showNodeLabels,
    nodeSizeMode,
    edgeWidth,
    nodeShape,
    layoutAnimation,
    fitRequest,
  } = useGraphStore()
  const isDark = useThemeStore((s) => s.isDark)

  const baseEdgeWidth = EDGE_WIDTH_MAP[edgeWidth]

  const styleArray = useMemo(() => [
    {
      selector: 'node',
      style: {
        'background-color': (ele: NodeSingular) => {
          const kind = ele.data('external_kind') as string | undefined
          if (kind === 'stdlib') return isDark ? '#64748b' : '#94a3b8'
          if (kind === 'package') return isDark ? '#d97706' : '#f59e0b'
          return nodeColorForId(ele.data('id'))
        },
        'label': showNodeLabels ? 'data(label)' : '',
        'shape': nodeShape,
        'width': nodeSizeMode === 'fixed' ? 40 : (ele: NodeSingular) => {
          const degree = ele.degree()
          return Math.max(30, Math.min(60, 30 + degree * 2))
        },
        'height': nodeSizeMode === 'fixed' ? 40 : (ele: NodeSingular) => {
          const degree = ele.degree()
          return Math.max(30, Math.min(60, 30 + degree * 2))
        },
        'font-size': '12px',
        'color': isDark ? '#f1f5f9' : '#1e293b',
        'text-valign': 'center',
        'text-halign': 'center',
        'text-wrap': 'wrap' as const,
        'text-max-width': '100px',
        'border-width': 2,
        'border-color': (ele: NodeSingular) => {
          const kind = ele.data('external_kind') as string | undefined
          if (kind === 'stdlib') return isDark ? '#64748b' : '#94a3b8'
          if (kind === 'package') return isDark ? '#d97706' : '#f59e0b'
          return nodeColorForId(ele.data('id'))
        },
      },
    },
    { selector: 'node:selected', style: { 'border-width': 4, 'border-color': '#a78bfa', 'background-color': '#a78bfa' } },
    {
      selector: 'edge',
      style: {
        'width': baseEdgeWidth,
        'line-color': isDark ? '#64748b' : '#cbd5e1',
        'target-arrow-color': isDark ? '#64748b' : '#cbd5e1',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'opacity': 0.7,
      },
    },
    { selector: 'edge:selected', style: { 'line-color': '#8b5cf6', 'target-arrow-color': '#8b5cf6', 'width': baseEdgeWidth + 1, 'opacity': 1 } },
    { selector: '.highlighted', style: { 'background-color': isDark ? '#f59e0b' : '#fbbf24', 'border-color': '#f59e0b', 'border-width': 3 } },
    { selector: '.connected-out', style: { 'line-color': '#3b82f6', 'target-arrow-color': '#3b82f6', 'width': baseEdgeWidth + 1, 'opacity': 1 } },
    { selector: '.connected-in', style: { 'line-color': '#10b981', 'target-arrow-color': '#10b981', 'width': baseEdgeWidth + 1, 'opacity': 1 } },
    { selector: '.connected', style: { 'line-color': '#8b5cf6', 'target-arrow-color': '#8b5cf6', 'width': baseEdgeWidth + 1, 'opacity': 1 } },
    { selector: '.dimmed', style: { 'opacity': 0.2 } },
  ], [showNodeLabels, nodeSizeMode, edgeWidth, nodeShape, isDark, baseEdgeWidth])

  useEffect(() => {
    if (!containerRef.current) return

    const nodes = analysis.nodes.filter((n) => {
      if (n.node_type !== 'external') return true
      const kind = n.external_kind ?? 'package'
      return (kind === 'stdlib' && showStdlibNodes) || (kind === 'package' && showExternalPackages)
    })
    const nodeIds = new Set(nodes.map(n => n.id))
    const edges = analysis.edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))

    const cy = cytoscape({
      container: containerRef.current,
      elements: {
        nodes: nodes.map(node => ({
          data: {
            id: node.id,
            label: node.label,
            node_type: node.node_type,
            file_path: node.file_path,
            external_kind: node.external_kind ?? undefined,
          },
        })),
        edges: edges.map(edge => ({
          data: { id: `${edge.source}-${edge.target}`, source: edge.target, target: edge.source },
        })),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Cytoscape stylesheet accepts mapper functions
      style: styleArray as any,
      layout: {
        name: layoutName,
        // @ts-expect-error - cola layout options
        infinite: false,
        fit: true,
        padding: 50,
        animate: layoutAnimation,
        animationDuration: 500,
      },
      minZoom: 0.1,
      maxZoom: 3,
    })

    cyRef.current = cy
    setCyInstance(cy)

    // Node click handler: set full node from analysis so MetricsPanel has import_count, imported_by_count, pagerank, etc.
    const nodeById = new Map(nodes.map((n) => [n.id, n]))
    cy.on('tap', 'node', (event) => {
      const node = event.target
      const id = node.data('id')
      const fullNode = nodeById.get(id) ?? null
      setSelectedNode(fullNode)
      
      // Highlight connected nodes and edges with direction-aware colors
      cy.elements().removeClass('highlighted connected connected-in connected-out dimmed')
      
      // Get outgoing and incoming edges separately
      const outgoingEdges = node.connectedEdges(`[source = "${id}"]`)
      const incomingEdges = node.connectedEdges(`[target = "${id}"]`)
      const allConnectedEdges = node.connectedEdges()
      const connectedNodes = allConnectedEdges.connectedNodes()
      
      // Dim unconnected elements
      cy.elements().addClass('dimmed')
      
      // Highlight the selected node and its connections
      node.removeClass('dimmed').addClass('highlighted')
      connectedNodes.removeClass('dimmed')
      
      // Color edges by direction
      outgoingEdges.removeClass('dimmed').addClass('connected-out')  // Blue for imports (what this node imports)
      incomingEdges.removeClass('dimmed').addClass('connected-in')   // Green for imported-by (who imports this node)
    })

    // Background click handler
    cy.on('tap', (event) => {
      if (event.target === cy) {
        setSelectedNode(null)
        cy.elements().removeClass('highlighted connected connected-in connected-out dimmed')
      }
    })

    return () => {
      setCyInstance(null)
      cy.destroy()
    }
  }, [analysis, layoutName, showStdlibNodes, showExternalPackages, setSelectedNode, setCyInstance])

  // Update style when display options change (no graph recreation)
  useEffect(() => {
    if (!cyRef.current) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Cytoscape stylesheet accepts mapper functions
    cyRef.current.style(styleArray as any)
  }, [styleArray])

  // Handle search
  useEffect(() => {
    if (!cyRef.current) return

    const cy = cyRef.current
    cy.elements().removeClass('highlighted dimmed')

    if (searchQuery) {
      const matchingNodes = cy.nodes().filter((node: NodeSingular) => {
        const label = node.data('label').toLowerCase()
        const filePath = node.data('file_path').toLowerCase()
        const query = searchQuery.toLowerCase()
        return label.includes(query) || filePath.includes(query)
      })

      if (matchingNodes.length > 0) {
        cy.elements().addClass('dimmed')
        matchingNodes.removeClass('dimmed').addClass('highlighted')
        
        // Fit to highlighted nodes
        cy.fit(matchingNodes, 50)
      }
    }
  }, [searchQuery])

  // Handle layout change
  useEffect(() => {
    if (!cyRef.current) return
    const cy = cyRef.current
    cy.layout({
      name: layoutName,
      // @ts-expect-error - cola layout options
      infinite: false,
      fit: true,
      padding: 50,
      animate: layoutAnimation,
      animationDuration: 500,
    }).run()
  }, [layoutName, layoutAnimation])

  // Fit to screen when user clicks "Fit to screen"
  useEffect(() => {
    if (!cyRef.current || fitRequest === 0) return
    cyRef.current.fit(undefined, 50)
  }, [fitRequest])

  // Handle external selectedNode change (e.g. from ExternalPackagesModal)
  useEffect(() => {
    if (!cyRef.current) return
    
    const cy = cyRef.current
    
    if (selectedNode) {
      const node = cy.getElementById(selectedNode.id)
      if (node.length > 0) {
        // Clear previous highlights
        cy.elements().removeClass('highlighted connected connected-in connected-out dimmed')
        
        // Get outgoing and incoming edges separately
        const id = selectedNode.id
        const outgoingEdges = node.connectedEdges(`[source = "${id}"]`)
        const incomingEdges = node.connectedEdges(`[target = "${id}"]`)
        const allConnectedEdges = node.connectedEdges()
        const connectedNodes = allConnectedEdges.connectedNodes()
        
        cy.elements().addClass('dimmed')
        node.removeClass('dimmed').addClass('highlighted')
        connectedNodes.removeClass('dimmed')
        
        // Color edges by direction
        outgoingEdges.removeClass('dimmed').addClass('connected-out')  // Blue for imports
        incomingEdges.removeClass('dimmed').addClass('connected-in')   // Green for imported-by
        
        // Zoom to node
        cy.animate({
          center: { eles: node },
          zoom: 1.5,
        }, {
          duration: 500,
          easing: 'ease-in-out-cubic',
        })
      }
    } else {
      // Clear highlights when no node selected
      cy.elements().removeClass('highlighted connected connected-in connected-out dimmed')
    }
  }, [selectedNode])

  // Handle full screen resize
  useEffect(() => {
    if (!cyRef.current) return
    
    const cy = cyRef.current
    
    // Small delay to let the DOM update
    const timer = setTimeout(() => {
      cy.resize()
      cy.fit(undefined, 50)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [isFullScreen])

  return (
    <div className={`relative w-full h-full dot-pattern-light dark:dot-pattern`}>
      <div
        ref={containerRef}
        className="w-full h-full rounded-xl"
        role="img"
        aria-label="Dependency graph visualization"
      />
      <GraphFloatingControls />

      {selectedNode && (
        <div className="absolute bottom-4 left-4 p-3 rounded-xl bg-white/90 dark:bg-slate-900/80 backdrop-blur-md border border-gray-200 dark:border-white/10 shadow-lg z-10">
          <div className="text-xs font-semibold text-gray-600 dark:text-slate-400 mb-2">Edge Colors</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-blue-500 rounded" />
              <span className="text-xs text-gray-500 dark:text-slate-500 font-mono-ui">Imports (outgoing)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-emerald-500 rounded" />
              <span className="text-xs text-gray-500 dark:text-slate-500 font-mono-ui">Imported by (incoming)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
