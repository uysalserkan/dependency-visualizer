import { useEffect } from 'react'
import { X } from 'lucide-react'
import { SourceAnalyzer } from '@/components/SourceAnalyzer'
import { ImportGraph } from '@/components/ImportGraph'
import { cn } from '@/lib/utils'

interface SourceImportModalProps {
  open: boolean
  onClose: () => void
}

export function SourceImportModal({ open, onClose }: SourceImportModalProps) {
  useEffect(() => {
    if (!open) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="source-import-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          'relative w-full max-w-lg max-h-[90vh] overflow-y-auto',
          'rounded-2xl border border-gray-200 dark:border-white/10',
          'bg-white dark:bg-slate-900 shadow-2xl'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-5 py-4 border-b border-gray-200 dark:border-white/5 bg-white dark:bg-slate-900 rounded-t-2xl">
          <h2 id="source-import-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">
            Analyze or import
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            aria-label="Close"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
        </div>
        <div className="p-5 space-y-5">
          <SourceAnalyzer onSuccessCallback={onClose} />
          <div className="text-center text-xs text-gray-500 dark:text-slate-400">or</div>
          <ImportGraph onSuccessCallback={onClose} />
        </div>
      </div>
    </div>
  )
}
