import { useCallback } from 'react'
import { toPng, toJpeg, toCanvas } from 'html-to-image'
import { useGraphStore } from '@/stores/graphStore'
import { useThemeStore } from '@/stores/themeStore'

export type ExportImageFormat = 'png' | 'jpeg'

const EXPORT_ERROR_MESSAGE =
  'Export failed. Try again or use a different zoom.'

function getDimensions(el: HTMLElement): { width: number; height: number } {
  const rect = el.getBoundingClientRect()
  let width = Math.floor(rect.width)
  let height = Math.floor(rect.height)
  if (width <= 0 || height <= 0) {
    width = el.offsetWidth || el.scrollWidth || 0
    height = el.offsetHeight || el.scrollHeight || 0
  }
  return { width, height }
}

function waitForLayout(ms = 100): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Extra delay to ensure fitView animation completes
        setTimeout(resolve, ms)
      })
    })
  })
}

const baseOptions = (
  width: number,
  height: number,
  backgroundColor: string,
  filter: (node: HTMLElement) => boolean
) => ({
  pixelRatio: 1.5, // 2 can be too heavy for large graphs or slow devices
  width,
  height,
  backgroundColor,
  cacheBust: true,
  filter,
  // Fix for React Flow / SVG heavy apps
  skipAutoScale: true,
  fontEmbedCSS: '',
  includeQueryParams: true,
  copyStyles: true,
  style: {
    transform: 'none',
    width: `${width}px`,
    height: `${height}px`,
  },
})



/** Shared logic for exporting the graph view as PNG or JPEG. */
export function useExportGraphPng() {
  const analysis = useGraphStore((s) => s.analysis)
  const flowWrapperRef = useGraphStore((s) => s.flowWrapperRef)
  const isDark = useThemeStore((s) => s.isDark)

  const filter = useCallback((node: HTMLElement) => {
    // Skip controls, panels, and elements explicitly marked to be skipped
    if (node instanceof Element && (
      node.closest?.('[data-skip-export]') ||
      node.classList.contains('react-flow__panel') ||
      node.classList.contains('react-flow__controls') ||
      node.classList.contains('react-flow__attribution') ||
      node.getAttribute('role') === 'dialog' // Skip modals/drawers
    )) {
      return false
    }
    return true
  }, [])



  const exportImage = useCallback(
    async (format: ExportImageFormat) => {
      if (!flowWrapperRef || !analysis) return
      try {
        // Center the graph before export using fitView
        // Get fresh instance from store in case it changed
        const instance = useGraphStore.getState().reactFlowInstance
        if (instance) {
          console.log('Centering graph with fitView...')
          instance.fitView({ padding: 0.1, duration: 0 })
          // Wait longer for the viewport transformation to complete
          await waitForLayout(300)
        }

        let { width, height } = getDimensions(flowWrapperRef)
        if (width <= 0 || height <= 0) {
          await waitForLayout()
          const d = getDimensions(flowWrapperRef)
          width = d.width
          height = d.height
        }
        if (width <= 0 || height <= 0) {
          console.warn('Image export: graph container has no visible area')
          alert(EXPORT_ERROR_MESSAGE)
          return
        }
        console.log(`Starting ${format} export...`, { width, height, isDark })
        const backgroundColor = isDark ? '#0f172a' : '#ffffff'
        const opts = baseOptions(width, height, backgroundColor, filter)
        let dataUrl: string
        try {
          console.log('Attempting html-to-image conversion...')
          dataUrl =
            format === 'jpeg'
              ? await toJpeg(flowWrapperRef, { ...opts, quality: 0.92 })
              : await toPng(flowWrapperRef, opts)
          console.log('Conversion successful')
        } catch (err) {
          console.warn('First export attempt failed, trying fallback...', err)
          // Fallback: toCanvas then toDataURL (sometimes more reliable with transforms)
          const canvas = await toCanvas(flowWrapperRef, opts)
          const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png'
          dataUrl = canvas.toDataURL(mime, format === 'jpeg' ? 0.92 : undefined)
          console.log('Fallback successful')
        }

        const ext = format === 'jpeg' ? 'jpg' : 'png'
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = `graph_${analysis.id}.${ext}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } catch (error) {
        console.error(`${format.toUpperCase()} export failed:`, error)
        alert(EXPORT_ERROR_MESSAGE)
      }
    },
    [flowWrapperRef, analysis, isDark, filter]
  )

  const exportPng = useCallback(() => exportImage('png'), [exportImage])

  return { exportPng, exportImage, canExport: Boolean(flowWrapperRef && analysis) }
}

