import { useEffect } from 'react'
import { useGraphStore } from '@/stores/graphStore'

export function useKeyboardShortcuts() {
  const { setSearchQuery, setSelectedNode, isFullScreen, toggleFullScreen } = useGraphStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement
        searchInput?.focus()
      }

      // Escape: Exit full screen or clear selection
      if (e.key === 'Escape') {
        if (isFullScreen) {
          toggleFullScreen()
        } else {
          setSelectedNode(null)
          setSearchQuery('')
        }
      }

      // Cmd/Ctrl + /: Toggle help (future)
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        // Could open help modal
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setSearchQuery, setSelectedNode, isFullScreen, toggleFullScreen])
}
