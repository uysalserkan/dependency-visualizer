import { useRef } from 'react'
import { FileUp, Loader2 } from 'lucide-react'
import { useImportGraph } from '@/hooks/useImportGraph'
import { useGraphStore } from '@/stores/graphStore'

const ACCEPT = '.json,.graphml,.gexf'
const MAX_SIZE_MB = 50

interface ImportGraphProps {
  /** Called after a successful import (e.g. to close a modal). */
  onSuccessCallback?: () => void
}

export function ImportGraph({ onSuccessCallback }: ImportGraphProps = {}) {
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
        onSuccessCallback?.()
      },
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/5 backdrop-blur-md bg-white/80 dark:bg-slate-900/50 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 flex items-center justify-center">
          <FileUp className="w-4 h-4 text-gray-500 dark:text-slate-400" aria-hidden />
        </div>
        <h2 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
          Import Graph
        </h2>
      </div>
      <p className="text-xs text-gray-500 dark:text-slate-500 leading-relaxed">
        Load a previously exported graph file
      </p>
      <label className="block">
        <span className="sr-only">Choose graph file</span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={handleFileChange}
          disabled={isPending}
          className="block w-full text-sm text-gray-600 dark:text-slate-400 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border file:border-gray-300 dark:file:border-white/10 file:bg-transparent file:text-gray-700 dark:file:text-white file:font-medium file:cursor-pointer hover:file:bg-gray-100 dark:hover:file:bg-white/5 disabled:opacity-50 file:transition-all file:duration-200 file:text-sm file:font-mono-ui"
        />
      </label>
      {isPending && (
        <div className="flex items-center gap-2 text-sm text-slate-500 font-mono-ui">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          <span>Importing…</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 font-mono-ui">
          {(error as Error).message}
        </div>
      )}
    </div>
  )
}
