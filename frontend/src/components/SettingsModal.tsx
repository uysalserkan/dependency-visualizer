import { useEffect, useRef } from 'react'
import { X, Settings } from 'lucide-react'
import { SettingsPanelContent } from './SettingsPanelContent'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    if (open) {
      closeButtonRef.current?.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 md:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 w-full h-full md:h-auto md:rounded-2xl shadow-2xl max-w-lg md:max-h-[85vh] flex flex-col border border-gray-200 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0 md:rounded-t-2xl bg-white dark:bg-slate-900 pt-[calc(env(safe-area-inset-top)+16px)] md:pt-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0">
              <Settings className="w-5 h-5 text-indigo-500" aria-hidden />
            </div>
            <h2 id="settings-modal-title" className="text-lg font-bold text-gray-900 dark:text-slate-100">
              Settings
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900"
            aria-label="Close settings"
          >
            <X className="w-5 h-5" aria-hidden />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 min-h-0 pb-[calc(env(safe-area-inset-bottom)+24px)]">
          <SettingsPanelContent />
        </div>
      </div>
    </div>
  )
}
