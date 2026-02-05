import { Download, Image } from 'lucide-react'
import { api } from '@/lib/api'
import { useGraphStore } from '@/stores/graphStore'
import { useExportGraphPng } from '@/hooks/useExportGraphPng'

export function ExportButton() {
  const analysis = useGraphStore((state) => state.analysis)
  const flowWrapperRef = useGraphStore((state) => state.flowWrapperRef)
  const { exportPng, exportImage } = useExportGraphPng()
  const canExport = Boolean(analysis && flowWrapperRef)

  if (!analysis) return null

  const handleExport = async (format: 'json' | 'graphml' | 'gexf') => {
    try {
      const blob = await api.exportGraph(analysis.id, format)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `graph_${analysis.id}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  return (
    <div className="relative group">
      <button
        type="button"
        aria-haspopup="true"
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-medium text-sm text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white bg-transparent hover:bg-gray-100 dark:hover:bg-white/5 transition-colors duration-200"
      >
        <Download className="w-4 h-4" />
        <span>Export</span>
      </button>

      <div className="absolute right-0 mt-2 w-52 rounded-xl border border-gray-200 dark:border-white/5 bg-white dark:bg-slate-900/95 backdrop-blur-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-2xl py-2" role="menu">
        <button
          type="button"
          role="menuitem"
          onClick={() => handleExport('json')}
          className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors font-mono-ui"
        >
          Export as JSON
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => handleExport('graphml')}
          className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors font-mono-ui"
        >
          Export as GraphML
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => handleExport('gexf')}
          className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors font-mono-ui"
        >
          Export as GEXF
        </button>
        <div className="border-t border-gray-200 dark:border-white/5 my-2" role="separator" />
        <button
          type="button"
          role="menuitem"
          onClick={exportPng}
          disabled={!canExport}
          title={!canExport ? 'Graph not ready' : 'Export current view as PNG'}
          className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors font-mono-ui disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Image className="w-4 h-4 shrink-0" aria-hidden />
          Export as PNG
        </button>
        <button
          type="button"
          role="menuitem"
          onClick={() => exportImage('jpeg')}
          disabled={!canExport}
          title={!canExport ? 'Graph not ready' : 'Export current view as JPEG'}
          className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors font-mono-ui disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Image className="w-4 h-4 shrink-0" aria-hidden />
          Export as JPEG
        </button>
      </div>
    </div>
  )
}
