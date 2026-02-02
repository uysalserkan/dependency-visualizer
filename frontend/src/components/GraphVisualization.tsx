import { useEffect, useRef } from 'react'
import cytoscape, { type Core, type NodeSingular } from 'cytoscape'
// @ts-expect-error - cytoscape-cola has no types
import cola from 'cytoscape-cola'
import { useGraphStore } from '@/stores/graphStore'
import { useThemeStore } from '@/stores/themeStore'
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

interface GraphVisualizationProps {
  analysis: AnalysisResult
}

export function GraphVisualization({ analysis }: GraphVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
  const {
    selectedNode,
    setSelectedNode,
    layoutName,
    showExternalNodes,
    searchQuery,
  } = useGraphStore()
  const isDark = useThemeStore((s) => s.isDark)

  useEffect(() => {
    if (!containerRef.current) return

    // Filter nodes based on showExternalNodes
    const nodes = showExternalNodes 
      ? analysis.nodes 
      : analysis.nodes.filter(n => n.node_type !== 'external')
    
    const nodeIds = new Set(nodes.map(n => n.id))
    const edges = analysis.edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))

    // Initialize Cytoscape
    const cy = cytoscape({
      container: containerRef.current,
      elements: {
        nodes: nodes.map(node => ({
          data: {
            id: node.id,
            label: node.label,
            node_type: node.node_type,
            file_path: node.file_path,
          },
        })),
        // Arrow direction: dependency → consumer (e.g. utils → me when I import utils). API gives (importer, imported), we swap for display.
        edges: edges.map(edge => ({
          data: {
            id: `${edge.source}-${edge.target}`,
            source: edge.target,
            target: edge.source,
          },
        })),
      },
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele: NodeSingular) => nodeColorForId(ele.data('id')),
            'label': 'data(label)',
            'width': (ele: NodeSingular) => {
              const degree = ele.degree()
              return Math.max(30, Math.min(60, 30 + degree * 2))
            },
            'height': (ele: NodeSingular) => {
              const degree = ele.degree()
              return Math.max(30, Math.min(60, 30 + degree * 2))
            },
            'font-size': '12px',
            'color': isDark ? '#f1f5f9' : '#1e293b',
            'text-valign': 'center',
            'text-halign': 'center',
            'text-wrap': 'wrap',
            'text-max-width': '100px',
            'border-width': 2,
            'border-color': (ele: NodeSingular) => {
              const c = nodeColorForId(ele.data('id'))
              return c
            },
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#a78bfa',
            'background-color': '#a78bfa',
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': isDark ? '#64748b' : '#cbd5e1',
            'target-arrow-color': isDark ? '#64748b' : '#cbd5e1',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'opacity': 0.7,
          },
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#8b5cf6',
            'target-arrow-color': '#8b5cf6',
            'width': 3,
            'opacity': 1,
          },
        },
        {
          selector: '.highlighted',
          style: {
            'background-color': isDark ? '#f59e0b' : '#fbbf24',
            'border-color': '#f59e0b',
            'border-width': 3,
          },
        },
        {
          selector: '.connected',
          style: {
            'line-color': '#8b5cf6',
            'target-arrow-color': '#8b5cf6',
            'width': 3,
            'opacity': 1,
          },
        },
        {
          selector: '.dimmed',
          style: {
            'opacity': 0.2,
          },
        },
      ],
      layout: {
        name: layoutName,
        // @ts-expect-error - cola layout options
        infinite: false,
        fit: true,
        padding: 50,
        animate: true,
        animationDuration: 500,
      },
      minZoom: 0.1,
      maxZoom: 3,
    })

    cyRef.current = cy

    // Node click handler: set full node from analysis so MetricsPanel has import_count, imported_by_count, pagerank, etc.
    const nodeById = new Map(nodes.map((n) => [n.id, n]))
    cy.on('tap', 'node', (event) => {
      const node = event.target
      const id = node.data('id')
      const fullNode = nodeById.get(id) ?? null
      setSelectedNode(fullNode)
      
      // Highlight connected nodes and edges
      cy.elements().removeClass('highlighted connected dimmed')
      
      const connectedEdges = node.connectedEdges()
      const connectedNodes = connectedEdges.connectedNodes()
      
      // Dim unconnected elements
      cy.elements().addClass('dimmed')
      
      // Highlight the selected node and its connections
      node.removeClass('dimmed').addClass('highlighted')
      connectedNodes.removeClass('dimmed')
      connectedEdges.removeClass('dimmed').addClass('connected')
    })

    // Background click handler
    cy.on('tap', (event) => {
      if (event.target === cy) {
        setSelectedNode(null)
        cy.elements().removeClass('highlighted connected dimmed')
      }
    })

    return () => {
      cy.destroy()
    }
  }, [analysis, layoutName, showExternalNodes, setSelectedNode, isDark])

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
      animate: true,
      animationDuration: 500,
    }).run()
  }, [layoutName])

  // Handle external selectedNode change (e.g. from ExternalPackagesModal)
  useEffect(() => {
    if (!cyRef.current) return
    
    const cy = cyRef.current
    
    if (selectedNode) {
      const node = cy.getElementById(selectedNode.id)
      if (node.length > 0) {
        // Clear previous highlights
        cy.elements().removeClass('highlighted connected dimmed')
        
        // Highlight selected node and connections
        const connectedEdges = node.connectedEdges()
        const connectedNodes = connectedEdges.connectedNodes()
        
        cy.elements().addClass('dimmed')
        node.removeClass('dimmed').addClass('highlighted')
        connectedNodes.removeClass('dimmed')
        connectedEdges.removeClass('dimmed').addClass('connected')
        
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
      cy.elements().removeClass('highlighted connected dimmed')
    }
  }, [selectedNode])

  return (
    <div
      ref={containerRef}
      className="w-full h-full blueprint-grid-light dark:blueprint-grid rounded-xl"
      role="img"
      aria-label="Dependency graph visualization"
    />
  )
}
