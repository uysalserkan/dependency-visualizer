import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AnalyzeRequest } from '@/types/api'

export function useAnalyzeProject() {
  return useMutation({
    mutationFn: (request: AnalyzeRequest) => api.analyzeProject(request),
  })
}
