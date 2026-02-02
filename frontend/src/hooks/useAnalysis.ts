import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AnalyzeRequest, AnalyzeRepositoryRequest } from '@/types/api'

export function useAnalyzeProject() {
  return useMutation({
    mutationFn: (request: AnalyzeRequest) => api.analyzeProject(request),
  })
}

export function useAnalyzeRepository() {
  return useMutation({
    mutationFn: (request: AnalyzeRepositoryRequest) => api.analyzeRepository(request),
  })
}
