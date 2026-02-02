import { useGraphStore } from '@/stores/graphStore'
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
import { Network } from 'lucide-react'

function App() {
  const analysis = useGraphStore((state) => state.analysis)
  const isFullScreen = useGraphStore((state) => state.isFullScreen)

  useKeyboardShortcuts()

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      {/* Modern Header with Glassmorphism (hidden in full screen) */}
      {!isFullScreen && (
        <header className="shrink-0 sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-gray-950/80 border-b border-gray-200/50 dark:border-white/5">
          <div className="max-w-[1800px] mx-auto px-6 lg:px-12 py-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20">
                  <Network className="w-6 h-6 text-white" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight truncate">
                    Import Visualizer
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {analysis
                      ? analysis.project_path
                      : 'Map dependencies for Python, JavaScript & TypeScript'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {analysis && <ExportButton />}
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 w-full mx-auto px-6 lg:px-12 py-8 max-w-[1800px]">
        {!analysis ? (
          <div className="max-w-3xl mx-auto space-y-12 py-16">
            <section
              className="text-center space-y-6"
              aria-label="Get started"
            >
              <div className="space-y-4">
                <h2 className="text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
                  Visualize Your Code
                </h2>
                <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl mx-auto">
                  Analyze and map import relationships across your entire codebase with beautiful, interactive visualizations.
                </p>
              </div>
              <div className="pt-8 grid gap-8 sm:grid-cols-1 lg:grid-cols-2 max-w-4xl mx-auto">
                <ProjectSelector />
                <RepositorySelector />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-500 leading-relaxed pt-4">
                Supports Python, JavaScript, and TypeScript • Interactive graph visualization • Export in multiple formats
              </p>
            </section>
            <section aria-label="Import graph" className="max-w-xl mx-auto">
              <div className="text-center mb-6">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Or import an existing analysis</span>
              </div>
              <ImportGraph />
            </section>
          </div>
        ) : (
          <div className={`transition-all duration-300 ease-in-out ${isFullScreen ? 'fixed inset-0 z-40 bg-gray-50 dark:bg-gray-950 p-4' : 'grid grid-cols-1 xl:grid-cols-12 gap-6 h-[calc(100vh-140px)]'}`}>
            {/* Left Sidebar - Control Panel (hidden in full screen) */}
            {!isFullScreen && (
              <aside className="xl:col-span-3 space-y-6 overflow-y-auto transition-opacity duration-300" aria-label="Analysis controls">
                <ProjectSelector />
                <RepositorySelector />
                <ImportGraph />
                <ControlPanel />
              </aside>
            )}

            {/* Center - Graph Visualization (Hero) */}
            <section
              className={`transition-all duration-300 ease-in-out ${isFullScreen ? 'h-full w-full' : 'xl:col-span-6 min-h-[500px] xl:min-h-0'}`}
              aria-label="Dependency graph"
            >
              <div className={`glass dark:glass rounded-2xl border dark:border-white/10 overflow-hidden h-full relative group transition-all duration-300 ${isFullScreen ? 'shadow-2xl' : ''}`}>
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-violet-500/5 pointer-events-none" />
                <GraphVisualization analysis={analysis} />
              </div>
            </section>

            {/* Right Sidebar - Metrics & Insights (hidden in full screen) */}
            {!isFullScreen && (
              <aside className="xl:col-span-3 space-y-6 overflow-y-auto transition-opacity duration-300" aria-label="Metrics and insights">
                <MetricsPanel />
                <InsightsPanel />
              </aside>
            )}
          </div>
        )}
      </main>

      <footer className={`shrink-0 py-6 border-t border-gray-200/50 dark:border-white/5 bg-white/50 dark:bg-gray-950/50 backdrop-blur-xl transition-opacity duration-300 ${isFullScreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="max-w-[1800px] mx-auto px-6 lg:px-12 text-center text-sm text-gray-500 dark:text-gray-500">
          Import Visualizer — Analyze and visualize project dependencies
        </div>
      </footer>
    </div>
  )
}

export default App
