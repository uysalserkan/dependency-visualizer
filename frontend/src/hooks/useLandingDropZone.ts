import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * Manages drag-over-window state for the landing drop zone.
 * Uses a counter so dragleave when moving over children doesn't hide the overlay.
 * Only active when isLanding is true. Calls onDropCallback with dropped files.
 */
export function useLandingDropZone(
  isLanding: boolean,
  onDropCallback?: (files: FileList | null) => void
) {
  const [isDragging, setDragging] = useState(false)
  const dragCounterRef = useRef(0)
  const onDropRef = useRef(onDropCallback)
  onDropRef.current = onDropCallback

  const onDrop = useCallback((files: FileList | null) => {
    dragCounterRef.current = 0
    setDragging(false)
    onDropRef.current?.(files)
  }, [])

  useEffect(() => {
    if (!isLanding) return

    const handleDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes('Files')) return
      e.preventDefault()
      dragCounterRef.current += 1
      setDragging(true)
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      dragCounterRef.current -= 1
      if (dragCounterRef.current <= 0) {
        dragCounterRef.current = 0
        setDragging(false)
      }
    }

    const handleDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes('Files')) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      const files = e.dataTransfer?.files ?? null
      dragCounterRef.current = 0
      setDragging(false)
      onDropRef.current?.(files)
    }

    const target = document.body
    target.addEventListener('dragenter', handleDragEnter, true)
    target.addEventListener('dragleave', handleDragLeave, true)
    target.addEventListener('dragover', handleDragOver, true)
    target.addEventListener('drop', handleDrop, true)

    return () => {
      target.removeEventListener('dragenter', handleDragEnter, true)
      target.removeEventListener('dragleave', handleDragLeave, true)
      target.removeEventListener('dragover', handleDragOver, true)
      target.removeEventListener('drop', handleDrop, true)
    }
  }, [isLanding])

  return { isDragging, onDrop }
}
