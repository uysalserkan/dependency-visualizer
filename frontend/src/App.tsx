import { useEffect } from 'react'
import { useGraphStore } from '@/stores/graphStore'
import { useThemeStore } from '@/stores/themeStore'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { ProjectSelector } from '@/components/ProjectSelector'
import { RepositorySelector } from '@/components/RepositorySelector'
import { ImportGraph } from '@/components/ImportGraph'
import { GraphVisualization } from '@/components/GraphVisualization'
import { ControlPanel } from '@/components/ControlPanel'
import { MetricsPanel } from '@/components/MetricsPanel'
import { InsightsPanel } from '@/components/InsightsPanel'
import { ExportButton } from '@/components/ExportButton'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ProjectFolderTree } from '@/components/ProjectFolderTree'
import { Network } from 'lucide-react'

function App() {
  const analysis = useGraphStore((state) => state.analysis)
  const isFullScreen = useGraphStore((state) => state.isFullScreen)

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
              <div className="pt-8 grid gap-6 sm:grid-cols-1 lg:grid-cols-2 max-w-4xl mx-auto">
                <ProjectSelector />
                <RepositorySelector />
              </div>
              <p className="text-sm text-gray-500 dark:text-slate-500 leading-relaxed pt-4 font-mono-ui">
                Supports Python, JavaScript, TypeScript • Export in multiple formats
              </p>
            </section>
            <section aria-label="Import graph" className="max-w-xl mx-auto">
              <div className="text-center mb-4">
                <span className="text-sm text-gray-500 dark:text-slate-500">Or import an existing analysis</span>
              </div>
              <ImportGraph />
            </section>
          </div>
        ) : (
          <div
            className={`transition-all duration-300 ease-in-out ${isFullScreen ? 'fixed inset-0 z-40 bg-gray-50 dark:bg-slate-950 p-4' : 'grid grid-cols-1 xl:grid-cols-12 gap-5 h-[calc(100vh-120px)]'}`}
          >
            {!isFullScreen && (
              <aside className="xl:col-span-2 space-y-5 overflow-y-auto" aria-label="Analysis controls">
                <ProjectFolderTree />
                <ProjectSelector />
                <RepositorySelector />
                <ImportGraph />
                <ControlPanel />
              </aside>
            )}

            <section
              className={`transition-all duration-300 ${isFullScreen ? 'h-full w-full' : 'xl:col-span-8 min-h-[500px] xl:min-h-0'}`}
              aria-label="Dependency graph"
            >
              <div
                className={`rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden h-full relative backdrop-blur-md bg-white/80 dark:bg-slate-900/50 ${isFullScreen ? 'shadow-2xl' : ''}`}
              >
                <GraphVisualization analysis={analysis} />
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
    </div>
  )
}

export default App
