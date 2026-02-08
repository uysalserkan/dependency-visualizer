import { create } from 'zustand'
import type { ReactFlowInstance } from '@xyflow/react'
import type { AnalysisResult, Node } from '@/types/api'

export type NodeSizeMode = 'degree' | 'fixed'
export type EdgeWidthPreset = 'thin' | 'normal' | 'thick'
export type NodeShapeType = 'ellipse' | 'rectangle' | 'round-rectangle' | 'diamond'
export type LabelFontSize = 'small' | 'medium' | 'large'
export type NodeBorderWidth = 'thin' | 'normal' | 'thick'
export type EdgeCurveStyle = 'bezier' | 'unbundled-bezier' | 'straight' | 'bundled'
export type EdgeOpacityPreset = 'faded' | 'normal' | 'solid'
export type ViewMode = 'graph' | 'list'
export type HeatmapMode =
  | 'off'
  | 'god_fanout'
  | 'god_fanin'
  | 'impact_pagerank'
  | 'impact_betweenness'

interface GraphState {
  analysis: AnalysisResult | null
  selectedNode: Node | null
  /** Relative path under project_path for folder-scoped graph; null = full project. */
  selectedFolderPath: string | null
  searchQuery: string
  layoutName: string
  /** Main content view: graph (React Flow) or list (table of nodes). */
  viewMode: ViewMode
  /** Show built-in / standard library nodes (e.g. os, json, fs, path). */
  showStdlibNodes: boolean
  /** Show third-party external package nodes (e.g. lodash, requests). */
  showExternalPackages: boolean
  isFullScreen: boolean
  // Display options
  showNodeLabels: boolean
  nodeSizeMode: NodeSizeMode
  edgeWidth: EdgeWidthPreset
  nodeShape: NodeShapeType
  labelFontSize: LabelFontSize
  nodeBorderWidth: NodeBorderWidth
  edgeCurveStyle: EdgeCurveStyle
  edgeOpacity: EdgeOpacityPreset
  layoutAnimation: boolean
  fitRequest: number
  /** Graph area background: dots or blueprint grid. */
  graphBackground: 'dots' | 'grid'
  /** React Flow wrapper element for client-side PNG export; set by GraphVisualization, cleared on unmount. */
  flowWrapperRef: HTMLElement | null
  /** React Flow instance for programmatic control (fitView, etc.) */
  reactFlowInstance: ReactFlowInstance | null
  /** Heatmap: color nodes by refactor hotspot metric (off = default node colors). */
  heatmapMode: HeatmapMode
  /** Whether the right metrics panel is visible. */
  isMetricsPanelOpen: boolean
  /** Whether the left project tree sidebar is visible. */
  isProjectTreeOpen: boolean

  // Modal states
  showPreview: boolean
  showExternalPackagesModal: boolean
  showImportRelations: boolean
  showOutgoingModal: boolean
  showIncomingModal: boolean
  showEntryPoints: boolean

  /** Folder paths that are collapsed in the graph (shown as one cluster node). */
  collapsedFolders: string[]

  setAnalysis: (analysis: AnalysisResult | null) => void
  setFlowWrapperRef: (el: HTMLElement | null) => void
  setReactFlowInstance: (instance: ReactFlowInstance | null) => void
  setSelectedNode: (node: Node | null) => void
  setSelectedFolderPath: (path: string | null) => void
  setSearchQuery: (query: string) => void
  setLayoutName: (layout: string) => void
  setViewMode: (mode: ViewMode) => void
  setShowStdlibNodes: (show: boolean) => void
  setShowExternalPackages: (show: boolean) => void
  toggleFullScreen: () => void
  toggleMetricsPanel: () => void
  toggleProjectTree: () => void
  setShowNodeLabels: (show: boolean) => void

  // Modal actions
  setShowPreview: (show: boolean) => void
  setShowExternalPackagesModal: (show: boolean) => void
  setShowImportRelations: (show: boolean) => void
  setShowOutgoingModal: (show: boolean) => void
  setShowIncomingModal: (show: boolean) => void
  setShowEntryPoints: (show: boolean) => void
  setNodeSizeMode: (mode: NodeSizeMode) => void
  setEdgeWidth: (width: EdgeWidthPreset) => void
  setNodeShape: (shape: NodeShapeType) => void
  setLabelFontSize: (size: LabelFontSize) => void
  setNodeBorderWidth: (width: NodeBorderWidth) => void
  setEdgeCurveStyle: (style: EdgeCurveStyle) => void
  setEdgeOpacity: (opacity: EdgeOpacityPreset) => void
  setLayoutAnimation: (animate: boolean) => void
  requestFit: () => void
  setGraphBackground: (bg: 'dots' | 'grid') => void
  setHeatmapMode: (mode: HeatmapMode) => void
  setCollapsedFolder: (folderPath: string, collapsed: boolean) => void
  /** Set all folder paths collapsed in graph at once; pass [] to expand all. */
  setCollapsedFolders: (paths: string[]) => void
}

export const useGraphStore = create<GraphState>((set) => ({
  analysis: null,
  selectedNode: null,
  selectedFolderPath: null,
  searchQuery: '',
  layoutName: 'cola',
  viewMode: 'graph',
  showStdlibNodes: false,
  showExternalPackages: false,
  isFullScreen: false,
  showNodeLabels: true,
  nodeSizeMode: 'degree',
  edgeWidth: 'normal',
  nodeShape: 'round-rectangle',
  labelFontSize: 'medium',
  nodeBorderWidth: 'normal',
  edgeCurveStyle: 'bezier',
  edgeOpacity: 'normal',
  layoutAnimation: true,
  fitRequest: 0,
  graphBackground: 'dots',
  flowWrapperRef: null,
  reactFlowInstance: null,
  heatmapMode: 'off',
  isMetricsPanelOpen: true,
  isProjectTreeOpen: true,

  showPreview: false,
  showExternalPackagesModal: false,
  showImportRelations: false,
  showOutgoingModal: false,
  showIncomingModal: false,
  showEntryPoints: false,

  collapsedFolders: [],

  setAnalysis: (analysis) => set({ analysis, selectedNode: null, selectedFolderPath: null }),
  setFlowWrapperRef: (el) => set({ flowWrapperRef: el }),
  setReactFlowInstance: (instance) => set({ reactFlowInstance: instance }),
  setSelectedNode: (node) => set({ selectedNode: node }),
  setSelectedFolderPath: (path) => set({ selectedFolderPath: path }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setLayoutName: (layout) => set({ layoutName: layout }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setShowStdlibNodes: (show) => set({ showStdlibNodes: show }),
  setShowExternalPackages: (show) => set({ showExternalPackages: show }),
  toggleFullScreen: () => set((state) => ({ isFullScreen: !state.isFullScreen })),
  toggleMetricsPanel: () => set((state) => ({ isMetricsPanelOpen: !state.isMetricsPanelOpen })),
  toggleProjectTree: () => set((state) => ({ isProjectTreeOpen: !state.isProjectTreeOpen })),
  setShowNodeLabels: (show) => set({ showNodeLabels: show }),

  setShowPreview: (show) => set({ showPreview: show }),
  setShowExternalPackagesModal: (show) => set({ showExternalPackagesModal: show }),
  setShowImportRelations: (show) => set({ showImportRelations: show }),
  setShowOutgoingModal: (show) => set({ showOutgoingModal: show }),
  setShowIncomingModal: (show) => set({ showIncomingModal: show }),
  setShowEntryPoints: (show) => set({ showEntryPoints: show }),
  setNodeSizeMode: (mode) => set({ nodeSizeMode: mode }),
  setEdgeWidth: (width) => set({ edgeWidth: width }),
  setNodeShape: (shape) => set({ nodeShape: shape }),
  setLabelFontSize: (size) => set({ labelFontSize: size }),
  setNodeBorderWidth: (width) => set({ nodeBorderWidth: width }),
  setEdgeCurveStyle: (style) => set({ edgeCurveStyle: style }),
  setEdgeOpacity: (opacity) => set({ edgeOpacity: opacity }),
  setLayoutAnimation: (animate) => set({ layoutAnimation: animate }),
  requestFit: () => set((state) => ({ fitRequest: state.fitRequest + 1 })),
  setGraphBackground: (bg) => set({ graphBackground: bg }),
  setHeatmapMode: (mode) => set({ heatmapMode: mode }),
  setCollapsedFolder: (folderPath, collapsed) =>
    set((state) => {
      const set = new Set(state.collapsedFolders)
      if (collapsed) set.add(folderPath)
      else set.delete(folderPath)
      return { collapsedFolders: [...set] }
    }),
  setCollapsedFolders: (paths) => set({ collapsedFolders: paths }),
}))
