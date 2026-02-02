import { create } from 'zustand'
import type { AnalysisResult, Node } from '@/types/api'

interface GraphState {
  analysis: AnalysisResult | null
  selectedNode: Node | null
  searchQuery: string
  layoutName: string
  showExternalNodes: boolean
  isFullScreen: boolean
  
  setAnalysis: (analysis: AnalysisResult | null) => void
  setSelectedNode: (node: Node | null) => void
  setSearchQuery: (query: string) => void
  setLayoutName: (layout: string) => void
  setShowExternalNodes: (show: boolean) => void
  toggleFullScreen: () => void
}

export const useGraphStore = create<GraphState>((set) => ({
  analysis: null,
  selectedNode: null,
  searchQuery: '',
  layoutName: 'cola',
  showExternalNodes: false,
  isFullScreen: false,
  
  setAnalysis: (analysis) => set({ analysis, selectedNode: null }),
  setSelectedNode: (node) => set({ selectedNode: node }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setLayoutName: (layout) => set({ layoutName: layout }),
  setShowExternalNodes: (show) => set({ showExternalNodes: show }),
  toggleFullScreen: () => set((state) => ({ isFullScreen: !state.isFullScreen })),
}))
