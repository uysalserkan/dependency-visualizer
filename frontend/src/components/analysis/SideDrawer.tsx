import { useEffect } from 'react'

interface SideDrawerProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

/**
 * Slide-out drawer for mobile (max-md). Fixed overlay with backdrop; panel slides in from left.
 * Z-index: backdrop 29, panel 30 so it sits above bottom sheet (20) and toolbar (10).
 */
export function SideDrawer({ open, onClose, children }: SideDrawerProps) {
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
        aria-label="File tree"
        role="dialog"
        className={`fixed left-0 top-0 bottom-0 w-[280px] max-w-[85vw] bg-white dark:bg-slate-900 shadow-xl overflow-y-auto z-[30] transition-transform duration-200 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {children}
      </div>
    </>
  )
}
