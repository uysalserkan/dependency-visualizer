import { create } from 'zustand'
import type { Core } from 'cytoscape'
import type { AnalysisResult, Node } from '@/types/api'

export type NodeSizeMode = 'degree' | 'fixed'
export type EdgeWidthPreset = 'thin' | 'normal' | 'thick'
export type NodeShapeType = 'ellipse' | 'rectangle' | 'round-rectangle' | 'diamond'

interface GraphState {
  analysis: AnalysisResult | null
  selectedNode: Node | null
  searchQuery: string
  layoutName: string
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
  layoutAnimation: boolean
  fitRequest: number
  /** Cytoscape instance for client-side PNG export; set by GraphVisualization, cleared on unmount. */
  cyInstance: Core | null

  setAnalysis: (analysis: AnalysisResult | null) => void
  setCyInstance: (cy: Core | null) => void
  setSelectedNode: (node: Node | null) => void
  setSearchQuery: (query: string) => void
  setLayoutName: (layout: string) => void
  setShowStdlibNodes: (show: boolean) => void
  setShowExternalPackages: (show: boolean) => void
  toggleFullScreen: () => void
  setShowNodeLabels: (show: boolean) => void
  setNodeSizeMode: (mode: NodeSizeMode) => void
  setEdgeWidth: (width: EdgeWidthPreset) => void
  setNodeShape: (shape: NodeShapeType) => void
  setLayoutAnimation: (animate: boolean) => void
  requestFit: () => void
}

export const useGraphStore = create<GraphState>((set) => ({
  analysis: null,
  selectedNode: null,
  searchQuery: '',
  layoutName: 'cola',
  showStdlibNodes: false,
  showExternalPackages: false,
  isFullScreen: false,
  showNodeLabels: true,
  nodeSizeMode: 'degree',
  edgeWidth: 'normal',
  nodeShape: 'ellipse',
  layoutAnimation: true,
  fitRequest: 0,
  cyInstance: null,

  setAnalysis: (analysis) => set({ analysis, selectedNode: null, cyInstance: null }),
  setCyInstance: (cy) => set({ cyInstance: cy }),
  setSelectedNode: (node) => set({ selectedNode: node }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setLayoutName: (layout) => set({ layoutName: layout }),
  setShowStdlibNodes: (show) => set({ showStdlibNodes: show }),
  setShowExternalPackages: (show) => set({ showExternalPackages: show }),
  toggleFullScreen: () => set((state) => ({ isFullScreen: !state.isFullScreen })),
  setShowNodeLabels: (show) => set({ showNodeLabels: show }),
  setNodeSizeMode: (mode) => set({ nodeSizeMode: mode }),
  setEdgeWidth: (width) => set({ edgeWidth: width }),
  setNodeShape: (shape) => set({ nodeShape: shape }),
  setLayoutAnimation: (animate) => set({ layoutAnimation: animate }),
  requestFit: () => set((state) => ({ fitRequest: state.fitRequest + 1 })),
}))
