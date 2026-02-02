import { Download } from 'lucide-react'
import { api } from '@/lib/api'
import { useGraphStore } from '@/stores/graphStore'

export function ExportButton() {
  const analysis = useGraphStore((state) => state.analysis)

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
        className="flex items-center gap-2 px-5 py-2.5 bg-white/10 dark:bg-white/10 text-gray-900 dark:text-white font-semibold rounded-xl hover:bg-white/20 dark:hover:bg-white/20 transition-all duration-300 backdrop-blur-xl border border-white/10"
      >
        <Download className="w-4 h-4" />
        <span className="text-sm">Export</span>
      </button>

      <div className="absolute right-0 mt-2 w-56 glass dark:glass rounded-xl border dark:border-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 backdrop-blur-2xl shadow-2xl" role="menu">
        <div className="py-2">
          <button
            type="button"
            role="menuitem"
            onClick={() => handleExport('json')}
            className="w-full text-left px-5 py-3 text-sm font-medium text-gray-900 dark:text-white hover:bg-white/10 dark:hover:bg-white/10 transition-colors"
          >
            Export as JSON
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => handleExport('graphml')}
            className="w-full text-left px-5 py-3 text-sm font-medium text-gray-900 dark:text-white hover:bg-white/10 dark:hover:bg-white/10 transition-colors"
          >
            Export as GraphML
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => handleExport('gexf')}
            className="w-full text-left px-5 py-3 text-sm font-medium text-gray-900 dark:text-white hover:bg-white/10 dark:hover:bg-white/10 transition-colors"
          >
            Export as GEXF
          </button>
        </div>
      </div>
    </div>
  )
}
