import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useImportGraph() {
  return useMutation({
    mutationFn: (file: File) => api.importGraph(file),
  })
}
