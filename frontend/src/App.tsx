import { useEffect, useState } from 'react'
import { useGraphStore } from '@/stores/graphStore'
import { useThemeStore } from '@/stores/themeStore'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { SourceImportModal } from '@/components/SourceImportModal'
import { GraphVisualization } from '@/components/GraphVisualization'
import { NodeListView } from '@/components/NodeListView'
import { MetricsPanel } from '@/components/MetricsPanel'
import { InsightsPanel } from '@/components/InsightsPanel'
import { ExportButton } from '@/components/ExportButton'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ProjectFolderTree } from '@/components/ProjectFolderTree'
import { SettingsModal } from '@/components/SettingsModal'
import { LandingHeroPreview } from '@/components/LandingHeroPreview'
import { LandingLanguageLogos } from '@/components/LandingLanguageLogos'
import { Network, GitBranch, List, FolderPlus, Star } from 'lucide-react'

/** GitHub repo URL for "Star on GitHub" link on landing. Set to empty string to hide. */
const GITHUB_REPO_URL = ''

/** Set to true to re-enable the List view tab. */
const LIST_VIEW_ENABLED = false

function App() {
  const analysis = useGraphStore((state) => state.analysis)
  const isFullScreen = useGraphStore((state) => state.isFullScreen)
  const viewMode = useGraphStore((state) => state.viewMode)
  const setViewMode = useGraphStore((state) => state.setViewMode)
  const [sourceImportOpen, setSourceImportOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

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
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-950 page-bg-depth transition-colors duration-200">
      {!isFullScreen && (
        <header className="shrink-0 sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-slate-900/40 border-b border-gray-100 dark:border-white/[0.06]">
          <div className="max-w-[1800px] mx-auto px-6 lg:px-10 py-3.5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center justify-center w-8 h-8 shrink-0 text-gray-500 dark:text-slate-400">
                  <Network className="w-5 h-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base font-semibold text-gray-900 dark:text-white tracking-tight truncate">
                    Import Visualizer
                  </h1>
                  {analysis && (
                    <p className="text-xs text-gray-500 dark:text-slate-500 truncate font-mono-ui mt-0.5">
                      {analysis.project_path}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {!analysis ? (
                  <>
                    {GITHUB_REPO_URL && (
                      <a
                        href={GITHUB_REPO_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        aria-label="Star on GitHub"
                      >
                        <Star className="w-4 h-4" aria-hidden />
                        <span className="hidden sm:inline">Star on GitHub</span>
                      </a>
                    )}
                    <ThemeToggle />
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setSourceImportOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      aria-label="Analyze or import"
                    >
                      <FolderPlus className="w-4 h-4" aria-hidden />
                      <span className="hidden sm:inline">Analyze / Import</span>
                    </button>
                    <ExportButton />
                    <ThemeToggle />
                  </>
                )}
              </div>
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 w-full mx-auto px-6 lg:px-10 py-6 max-w-[1800px]">
        {!analysis ? (
          <div className="max-w-6xl mx-auto py-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
              <section
                className="text-center lg:text-left space-y-6 order-1"
                aria-label="Get started"
              >
                <div className="space-y-4">
                  <h2 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-500 bg-clip-text text-transparent">
                    Visualize Your Code
                  </h2>
                  <p className="text-lg text-gray-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                    Runs 100% locally in your browser. Your code never leaves your device. Map import relationships across your codebase with interactive visualizations.
                  </p>
                </div>
                <div className="pt-8 max-w-xl mx-auto lg:mx-0 flex flex-col items-center lg:items-start gap-4">
                  <button
                    type="button"
                    onClick={() => setSourceImportOpen(true)}
                    className="inline-flex items-center gap-3 px-8 py-4 rounded-xl text-base font-semibold text-white bg-indigo-500 hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 transition-colors shadow-lg"
                    aria-label="Analyze project"
                  >
                    <FolderPlus className="w-5 h-5" aria-hidden />
                    Analyze Project
                  </button>
                  <p className="text-sm text-gray-500 dark:text-slate-500 leading-relaxed font-mono-ui">
                    Export in multiple formats
                  </p>
                </div>
              </section>
              <div className="order-2">
                <LandingHeroPreview />
              </div>
            </div>
            <LandingLanguageLogos />
          </div>
        ) : (
          <div
            className={`transition-all duration-300 ease-in-out ${isFullScreen ? 'fixed inset-0 z-40 bg-gray-50 dark:bg-slate-950 p-4' : 'grid grid-cols-1 xl:grid-cols-12 gap-5 h-[calc(100vh-120px)]'}`}
          >
            {!isFullScreen && (
              <aside className="xl:col-span-2 flex flex-col min-h-0 overflow-y-auto" aria-label="Analysis controls">
                <ProjectFolderTree />
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
                  <GraphVisualization
                    analysis={analysis}
                    onOpenSettings={() => setSettingsOpen(true)}
                  />
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
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}

export default App
