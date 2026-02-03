import { create } from 'zustand'
import type { Core } from 'cytoscape'
import type { AnalysisResult, Node } from '@/types/api'

export type NodeSizeMode = 'degree' | 'fixed'
export type EdgeWidthPreset = 'thin' | 'normal' | 'thick'
export type NodeShapeType = 'ellipse' | 'rectangle' | 'round-rectangle' | 'diamond'
export type LabelFontSize = 'small' | 'medium' | 'large'
export type NodeBorderWidth = 'thin' | 'normal' | 'thick'
export type EdgeCurveStyle = 'bezier' | 'straight'
export type EdgeOpacityPreset = 'faded' | 'normal' | 'solid'
export type ViewMode = 'graph' | 'list'

interface GraphState {
  analysis: AnalysisResult | null
  selectedNode: Node | null
  /** Relative path under project_path for folder-scoped graph; null = full project. */
  selectedFolderPath: string | null
  searchQuery: string
  layoutName: string
  /** Main content view: graph (Cytoscape) or list (table of nodes). */
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
  /** Cytoscape instance for client-side PNG export; set by GraphVisualization, cleared on unmount. */
  cyInstance: Core | null

  setAnalysis: (analysis: AnalysisResult | null) => void
  setCyInstance: (cy: Core | null) => void
  setSelectedNode: (node: Node | null) => void
  setSelectedFolderPath: (path: string | null) => void
  setSearchQuery: (query: string) => void
  setLayoutName: (layout: string) => void
  setViewMode: (mode: ViewMode) => void
  setShowStdlibNodes: (show: boolean) => void
  setShowExternalPackages: (show: boolean) => void
  toggleFullScreen: () => void
  setShowNodeLabels: (show: boolean) => void
  setNodeSizeMode: (mode: NodeSizeMode) => void
  setEdgeWidth: (width: EdgeWidthPreset) => void
  setNodeShape: (shape: NodeShapeType) => void
  setLabelFontSize: (size: LabelFontSize) => void
  setNodeBorderWidth: (width: NodeBorderWidth) => void
  setEdgeCurveStyle: (style: EdgeCurveStyle) => void
  setEdgeOpacity: (opacity: EdgeOpacityPreset) => void
  setLayoutAnimation: (animate: boolean) => void
  requestFit: () => void
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
  nodeShape: 'ellipse',
  labelFontSize: 'medium',
  nodeBorderWidth: 'normal',
  edgeCurveStyle: 'bezier',
  edgeOpacity: 'normal',
  layoutAnimation: true,
  fitRequest: 0,
  cyInstance: null,

  setAnalysis: (analysis) => set({ analysis, selectedNode: null, selectedFolderPath: null, cyInstance: null }),
  setCyInstance: (cy) => set({ cyInstance: cy }),
  setSelectedNode: (node) => set({ selectedNode: node }),
  setSelectedFolderPath: (path) => set({ selectedFolderPath: path }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setLayoutName: (layout) => set({ layoutName: layout }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setShowStdlibNodes: (show) => set({ showStdlibNodes: show }),
  setShowExternalPackages: (show) => set({ showExternalPackages: show }),
  toggleFullScreen: () => set((state) => ({ isFullScreen: !state.isFullScreen })),
  setShowNodeLabels: (show) => set({ showNodeLabels: show }),
  setNodeSizeMode: (mode) => set({ nodeSizeMode: mode }),
  setEdgeWidth: (width) => set({ edgeWidth: width }),
  setNodeShape: (shape) => set({ nodeShape: shape }),
  setLabelFontSize: (size) => set({ labelFontSize: size }),
  setNodeBorderWidth: (width) => set({ nodeBorderWidth: width }),
  setEdgeCurveStyle: (style) => set({ edgeCurveStyle: style }),
  setEdgeOpacity: (opacity) => set({ edgeOpacity: opacity }),
  setLayoutAnimation: (animate) => set({ layoutAnimation: animate }),
  requestFit: () => set((state) => ({ fitRequest: state.fitRequest + 1 })),
}))
