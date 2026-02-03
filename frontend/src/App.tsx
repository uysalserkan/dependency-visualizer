import { useEffect, useState } from 'react'
import { useGraphStore } from '@/stores/graphStore'
import { useThemeStore } from '@/stores/themeStore'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { SourceImportModal } from '@/components/SourceImportModal'
import { GraphVisualization } from '@/components/GraphVisualization'
import { NodeListView } from '@/components/NodeListView'
import { ControlPanel } from '@/components/ControlPanel'
import { MetricsPanel } from '@/components/MetricsPanel'
import { InsightsPanel } from '@/components/InsightsPanel'
import { ExportButton } from '@/components/ExportButton'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ProjectFolderTree } from '@/components/ProjectFolderTree'
import { Network, GitBranch, List, FolderPlus } from 'lucide-react'

/** Set to true to re-enable the List view tab. */
const LIST_VIEW_ENABLED = false

function App() {
  const analysis = useGraphStore((state) => state.analysis)
  const isFullScreen = useGraphStore((state) => state.isFullScreen)
  const viewMode = useGraphStore((state) => state.viewMode)
  const setViewMode = useGraphStore((state) => state.setViewMode)
  const [sourceImportOpen, setSourceImportOpen] = useState(false)

  useKeyboardShortcuts()

  // Keep document theme in sync with store (handles rehydration and any external changes)
  useEffect(() => {
    const syncTheme = () => {
      const isDark = useThemeStore.getState().isDark
      document.documentElement.classList.toggle('dark', isDark)
    }
    syncTheme()
    const unsub = useThemeStore.subscribe(syncTheme)
    return unsub
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-950 transition-colors duration-200">
      {!isFullScreen && (
        <header className="shrink-0 sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-slate-900/50 border-b border-gray-200 dark:border-white/5">
          <div className="max-w-[1800px] mx-auto px-6 lg:px-10 py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gray-100 dark:bg-slate-800/80 border border-gray-200 dark:border-white/5">
                  <Network className="w-5 h-5 text-gray-500 dark:text-slate-400" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight truncate">
                    Import Visualizer
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-slate-500 truncate font-mono-ui">
                    {analysis ? analysis.project_path : 'Python, JavaScript & TypeScript'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSourceImportOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  aria-label="Analyze or import"
                >
                  <FolderPlus className="w-4 h-4" aria-hidden />
                  <span className="hidden sm:inline">Analyze / Import</span>
                </button>
                {analysis && <ExportButton />}
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 w-full mx-auto px-6 lg:px-10 py-6 max-w-[1800px]">
        {!analysis ? (
          <div className="max-w-3xl mx-auto space-y-12 py-16">
            <section className="text-center space-y-6" aria-label="Get started">
              <div className="space-y-4">
                <h2 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                  Visualize Your Code
                </h2>
                <p className="text-lg text-gray-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
                  Map import relationships across your codebase with interactive visualizations.
                </p>
              </div>
              <div className="pt-8 max-w-xl mx-auto flex flex-col items-center gap-4">
                <button
                  type="button"
                  onClick={() => setSourceImportOpen(true)}
                  className="inline-flex items-center gap-3 px-8 py-4 rounded-xl text-base font-semibold text-white bg-indigo-500 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 transition-colors shadow-lg"
                  aria-label="Open analyze or import"
                >
                  <FolderPlus className="w-5 h-5" aria-hidden />
                  Analyze or import graph
                </button>
                <p className="text-sm text-gray-500 dark:text-slate-500 leading-relaxed font-mono-ui">
                  Supports Python, JavaScript, TypeScript • Export in multiple formats
                </p>
              </div>
            </section>
          </div>
        ) : (
          <div
            className={`transition-all duration-300 ease-in-out ${isFullScreen ? 'fixed inset-0 z-40 bg-gray-50 dark:bg-slate-950 p-4' : 'grid grid-cols-1 xl:grid-cols-12 gap-5 h-[calc(100vh-120px)]'}`}
          >
            {!isFullScreen && (
              <aside className="xl:col-span-2 space-y-5 overflow-y-auto" aria-label="Analysis controls">
                <ProjectFolderTree />
                <ControlPanel />
              </aside>
            )}

            <section
              className={`transition-all duration-300 flex flex-col gap-2 ${isFullScreen ? 'h-full w-full' : 'xl:col-span-8 min-h-[500px] xl:min-h-0'}`}
              aria-label="Main view"
            >
              {!isFullScreen && (
                <div className="shrink-0 flex rounded-lg border border-gray-200 dark:border-white/5 bg-gray-50/80 dark:bg-slate-800/50 p-1 w-fit" role="tablist" aria-label="View mode">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === 'graph'}
                    onClick={() => setViewMode('graph')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'graph' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}
                  >
                    <GitBranch className="w-4 h-4" aria-hidden />
                    Graph
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={viewMode === 'list'}
                    aria-disabled={!LIST_VIEW_ENABLED}
                    onClick={() => LIST_VIEW_ENABLED && setViewMode('list')}
                    disabled={!LIST_VIEW_ENABLED}
                    title={LIST_VIEW_ENABLED ? 'List view' : 'List view (disabled)'}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'} ${!LIST_VIEW_ENABLED ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <List className="w-4 h-4" aria-hidden />
                    List
                  </button>
                </div>
              )}
              <div
                className={`flex-1 min-h-0 rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden relative backdrop-blur-md bg-white/80 dark:bg-slate-900/50 ${isFullScreen ? 'shadow-2xl' : ''}`}
              >
                {viewMode === 'graph' || !LIST_VIEW_ENABLED ? (
                  <GraphVisualization analysis={analysis} />
                ) : (
                  <NodeListView />
                )}
              </div>
            </section>

            {!isFullScreen && (
              <aside className="xl:col-span-2 space-y-5 overflow-y-auto" aria-label="Metrics and insights">
                <MetricsPanel />
                <InsightsPanel />
              </aside>
            )}
          </div>
        )}
      </main>

      <footer
        className={`shrink-0 py-5 border-t border-gray-200 dark:border-white/5 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md ${isFullScreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      >
        <div className="max-w-[1800px] mx-auto px-6 lg:px-10 text-center text-xs text-gray-500 dark:text-slate-500 font-mono-ui">
          Import Visualizer — Analyze and visualize project dependencies
        </div>
      </footer>

      <SourceImportModal open={sourceImportOpen} onClose={() => setSourceImportOpen(false)} />
    </div>
  )
}

export default App
