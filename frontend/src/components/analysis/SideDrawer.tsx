import { useEffect } from 'react'

interface SideDrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

/**
 * Slide-out drawer for mobile (max-md). Fixed overlay with backdrop; panel slides in from left.
 * Z-index: backdrop 29, panel 30 so it sits above bottom sheet (20) and toolbar (10).
 */
export function SideDrawer({ open, onClose, title, children }: SideDrawerProps) {
  useEffect(() => {
    if (!open) return
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  }, [open, onClose])

  return (
    <>
      {/* Backdrop: tap to close */}
      <div
        role="presentation"
        aria-hidden
        className={`fixed inset-0 bg-black/40 z-[29] transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        aria-modal="true"
        aria-label={title || 'Side drawer'}
        role="dialog"
        className={`fixed left-0 top-0 bottom-0 w-[300px] max-w-[85vw] bg-white dark:bg-slate-900 shadow-xl overflow-y-auto z-[30] transition-transform duration-200 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {title ? (
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
            <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-tight uppercase">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-all active:scale-90"
              aria-label="Close drawer"
            >
              <span className="text-xl">✕</span>
            </button>
          </div>
        ) : null}
        <div className="px-6 py-4 pb-[calc(env(safe-area-inset-bottom)+32px)]">
          {children}
        </div>
      </div>
    </>
  )
}
