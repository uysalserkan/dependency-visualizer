/**
 * Full-screen overlay shown when user drags a file over the landing page.
 * Dims the screen and shows a large dashed "Drop Here" area in the center.
 */

interface LandingDropOverlayProps {
  visible: boolean
  onDrop?: (files: FileList | null) => void
}

export function LandingDropOverlay({ visible, onDrop }: LandingDropOverlayProps) {
  if (!visible) return null

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onDrop?.(e.dataTransfer?.files ?? null)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 dark:bg-black/50 transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      aria-label="Drop your project here"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div
        className="flex min-h-[200px] min-w-[280px] max-w-[90vw] flex-col items-center justify-center gap-2 rounded-2xl border-4 border-dashed border-gray-400 dark:border-slate-500 bg-white/5 dark:bg-white/5 px-8 py-10"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <span className="text-xl font-semibold text-gray-700 dark:text-slate-300">
          Drop Here
        </span>
        <span className="text-sm text-gray-500 dark:text-slate-400">
          Drop a .zip of your project to analyze
        </span>
      </div>
    </div>
  )
}
