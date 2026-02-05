import { useMemo, useState, type ReactNode } from 'react'
import { ChevronDown, ChevronUp, Minus } from 'lucide-react'

interface MobileBottomPanelProps {
  title: string
  children: ReactNode
}

type PanelLevel = 'peek' | 'mid' | 'full'

const LEVELS: PanelLevel[] = ['peek', 'mid', 'full']

const LEVEL_LABELS: Record<PanelLevel, string> = {
  peek: 'Peek',
  mid: 'Mid',
  full: 'Full',
}

const LEVEL_HEIGHTS: Record<PanelLevel, string> = {
  peek: 'h-[22vh]',
  mid: 'h-[50vh]',
  full: 'h-[86vh]',
}

export function MobileBottomPanel({ title, children }: MobileBottomPanelProps) {
  const [level, setLevel] = useState<PanelLevel>('peek')

  const nextLevel = useMemo(() => {
    const idx = LEVELS.indexOf(level)
    return LEVELS[(idx + 1) % LEVELS.length]
  }, [level])

  const handleCycle = () => setLevel(nextLevel)

  const heightClass = LEVEL_HEIGHTS[level]

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 lg:hidden">
      <div
        className={`mx-auto w-full max-w-2xl ${heightClass} bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-white/10 shadow-2xl flex flex-col transition-[height] duration-200 ease-out`}
        role="region"
        aria-label="Project metrics"
      >
        <div className="px-4 py-2 border-b border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-10 rounded-full bg-gray-200 dark:bg-slate-700" aria-hidden />
            <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
              {LEVEL_LABELS[level]}
            </span>
          </div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {title}
          </h2>
          <button
            type="button"
            onClick={handleCycle}
            className="inline-flex items-center gap-1 rounded-md border border-gray-200 dark:border-white/10 px-2 py-1 text-xs font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            aria-label={`Switch to ${LEVEL_LABELS[nextLevel]} view`}
            title={`Switch to ${LEVEL_LABELS[nextLevel]} view`}
          >
            {nextLevel === 'full' ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden />
            ) : nextLevel === 'mid' ? (
              <Minus className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden />
            )}
            {LEVEL_LABELS[nextLevel]}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+24px)] space-y-5">
          {children}
        </div>
      </div>
    </div>
  )
}
