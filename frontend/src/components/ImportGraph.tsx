import { useRef } from 'react'
import { FileUp, Loader2 } from 'lucide-react'
import { useImportGraph } from '@/hooks/useImportGraph'
import { useGraphStore } from '@/stores/graphStore'

const ACCEPT = '.json,.graphml,.gexf'
const MAX_SIZE_MB = 50

export function ImportGraph() {
  const inputRef = useRef<HTMLInputElement>(null)
  const { mutate: importGraph, isPending, error } = useImportGraph()
  const setAnalysis = useGraphStore((state) => state.setAnalysis)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return // will show error via UI if we add size validation message
    }
    importGraph(file, {
      onSuccess: (data) => {
        setAnalysis(data)
        if (inputRef.current) inputRef.current.value = ''
      },
    })
  }

  return (
    <div className="glass dark:glass rounded-2xl border dark:border-white/10 p-8 space-y-4 glass-hover">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
          <FileUp className="w-5 h-5 text-violet-500" aria-hidden />
        </div>
        <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
          Import Graph
        </h2>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
        Load a previously exported graph file to visualize it
      </p>
      <label className="block">
        <span className="sr-only">Choose graph file</span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={handleFileChange}
          disabled={isPending}
          className="block w-full text-sm text-gray-600 dark:text-gray-400 file:mr-3 file:py-3 file:px-5 file:rounded-xl file:border-0 file:bg-gradient-to-r file:from-violet-600 file:to-purple-600 file:text-white file:font-semibold file:cursor-pointer hover:file:from-violet-500 hover:file:to-purple-500 disabled:opacity-50 file:transition-all file:duration-300 file:shadow-lg file:shadow-violet-500/20"
        />
      </label>
      {isPending && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          <span>Importing…</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 backdrop-blur-xl">
          {(error as Error).message}
        </div>
      )}
    </div>
  )
}
