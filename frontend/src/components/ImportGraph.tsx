import { useRef, useState } from 'react'
import { FileUp, Loader2 } from 'lucide-react'
import { useImportGraph } from '@/hooks/useImportGraph'
import { useGraphStore } from '@/stores/graphStore'
import { cn } from '@/lib/utils'

const ACCEPT = '.json,.graphml,.gexf'
const MAX_SIZE_MB = 50

interface ImportGraphProps {
  /** Called after a successful import (e.g. to close a modal). */
  onSuccessCallback?: () => void
}

export function ImportGraph({ onSuccessCallback }: ImportGraphProps = {}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
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

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return
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
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 backdrop-blur-md bg-gray-50 dark:bg-white/5 p-6 space-y-4">
      <label
        className={cn(
          'group flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200',
          'border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-black/30 text-gray-700 dark:text-white/70 hover:border-gray-400 dark:hover:border-white/20 hover:bg-gray-200 dark:hover:bg-black/40',
          isDragging && 'border-purple-400/60 bg-purple-500/10 text-purple-700 dark:text-white'
        )}
        onDragEnter={() => setIsDragging(true)}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-300 dark:border-white/10 bg-gray-100 dark:bg-white/5">
          <FileUp className="h-5 w-5 text-gray-600 dark:text-white/70" aria-hidden />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Drag &amp; drop graph file or click to browse
          </p>
          <p className="text-xs text-gray-600 dark:text-white/40 font-mono">.json · .graphml · .gexf (max {MAX_SIZE_MB}MB)</p>
        </div>
        <span className="sr-only">Choose graph file</span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={handleFileChange}
          disabled={isPending}
          className="sr-only"
        />
      </label>
      {isPending && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-white/60 font-mono">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          <span>Importing…</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 font-mono">
          {(error as Error).message}
        </div>
      )}
    </div>
  )
}
