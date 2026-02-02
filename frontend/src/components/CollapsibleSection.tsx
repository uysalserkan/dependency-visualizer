import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CollapsibleSectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
}

export function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
  className,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  const id = title.replace(/\s+/g, '-').toLowerCase()
  return (
    <div className={cn('overflow-hidden', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-left bg-gray-100/80 dark:bg-white/5 hover:bg-gray-200/80 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-inset"
        aria-expanded={open}
        aria-controls={`collapsible-${id}`}
        id={`collapsible-${id}-button`}
      >
        <span className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight">
          {title}
        </span>
        <span className="shrink-0 text-gray-500 dark:text-slate-400" aria-hidden>
          {open ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </span>
      </button>
      <div
        id={`collapsible-${id}`}
        role="region"
        aria-labelledby={`collapsible-${id}-button`}
        className={cn(
          'transition-all duration-200 ease-out',
          open ? 'visible mt-2' : 'hidden'
        )}
      >
        {children}
      </div>
    </div>
  )
}
