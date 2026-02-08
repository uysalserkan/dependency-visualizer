import type {
  AnalysisResult,
  AnalyzeRequest,
  AnalyzeRepositoryRequest,
  FileBlameResponse,
  FilePreview,
  ImpactReport,
  InsightsResponse,
} from '@/types/api'

const API_BASE_URL = '/api'

export const api = {
  async analyzeProject(request: AnalyzeRequest): Promise<AnalysisResult> {
    const response = await fetch(`${API_BASE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(error.detail || 'Failed to analyze project')
    }

    return response.json()
  },

  async analyzeRepository(request: AnalyzeRepositoryRequest): Promise<AnalysisResult> {
    const response = await fetch(`${API_BASE_URL}/analyze/repository`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        repository_url: request.repository_url,
        branch: request.branch ?? undefined,
        ignore_patterns: request.ignore_patterns,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
      const message = typeof error.detail === 'string' ? error.detail : error.detail?.message ?? 'Failed to analyze repository'
      throw new Error(message)
    }

    return response.json()
  },

  async analyzeZip(file: File): Promise<AnalysisResult> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await fetch(`${API_BASE_URL}/analyze/zip`, {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(error.detail || 'Failed to analyze ZIP')
    }
    return response.json()
  },

  async getAnalysis(analysisId: string): Promise<AnalysisResult> {
    const response = await fetch(`${API_BASE_URL}/analysis/${analysisId}`)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(error.detail || 'Failed to fetch analysis')
    }

    return response.json()
  },

  async deleteAnalysis(analysisId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/analysis/${analysisId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(error.detail || 'Failed to delete analysis')
    }
  },

  async getFilePreview(analysisId: string, filePath: string): Promise<FilePreview> {
    const response = await fetch(
      `${API_BASE_URL}/analysis/${analysisId}/file-preview?file_path=${encodeURIComponent(filePath)}`
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(error.detail || 'Failed to fetch file preview')
    }

    return response.json()
  },

  async getBlame(analysisId: string, filePath: string): Promise<FileBlameResponse> {
    const response = await fetch(
      `${API_BASE_URL}/analysis/${analysisId}/blame?file_path=${encodeURIComponent(filePath)}`
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(typeof error.detail === 'string' ? error.detail : error.detail?.message ?? 'Failed to fetch blame')
    }

    return response.json()
  },

  async exportGraph(analysisId: string, format: 'json' | 'graphml' | 'gexf'): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/analysis/${analysisId}/export?format=${format}`)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(error.detail || 'Failed to export graph')
    }

    return response.blob()
  },

  async getInsights(analysisId: string): Promise<InsightsResponse> {
    const response = await fetch(`${API_BASE_URL}/analysis/${analysisId}/insights`)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(error.detail || 'Failed to fetch insights')
    }

    return response.json()
  },

  /** Import an exported graph file (.json, .graphml, .gexf) and get AnalysisResult */
  async importGraph(file: File): Promise<AnalysisResult> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_BASE_URL}/analysis/import`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(error.detail || 'Failed to import graph')
    }

    return response.json()
  },

  async getImpact(analysisId: string, filePath: string, depth = -1): Promise<ImpactReport> {
    const params = new URLSearchParams({
      file_path: filePath,
      depth: String(depth),
    })
    const response = await fetch(
      `${API_BASE_URL}/analysis/${analysisId}/impact?${params}`,
      { method: 'POST' }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
      throw new Error(error.detail || 'Failed to analyze impact')
    }

    return response.json()
  },
}
