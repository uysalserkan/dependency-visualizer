import { useState } from 'react'
import { FolderOpen, Loader2 } from 'lucide-react'
import { useAnalyzeProject } from '@/hooks/useAnalysis'
import { useGraphStore } from '@/stores/graphStore'

export function ProjectSelector() {
  const [projectPath, setProjectPath] = useState('')
  const { mutate: analyzeProject, isPending, error } = useAnalyzeProject()
  const setAnalysis = useGraphStore((state) => state.setAnalysis)

  const handleAnalyze = () => {
    if (!projectPath.trim()) return

    analyzeProject(
      { project_path: projectPath },
      {
        onSuccess: (data) => {
          setAnalysis(data)
        },
      }
    )
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAnalyze()
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/5 backdrop-blur-md bg-white/80 dark:bg-slate-900/50 p-6 space-y-6">
      <div className="space-y-3">
        <label htmlFor="project-path" className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-slate-400">
          <FolderOpen className="w-4 h-4 text-gray-500 dark:text-slate-500" aria-hidden />
          <span>Project Path</span>
        </label>
        <input
          id="project-path"
          type="text"
          value={projectPath}
          onChange={(e) => setProjectPath(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="/path/to/your/project"
          aria-label="Project directory path"
          aria-describedby="project-path-hint"
          className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 transition-all font-mono-ui text-sm"
          disabled={isPending}
        />
      </div>

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={isPending || !projectPath.trim()}
        aria-busy={isPending}
        aria-label={isPending ? 'Analyzing project' : 'Analyze project'}
        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-indigo-500 text-white font-semibold rounded-xl hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-950"
      >
        {isPending ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Analyzing...</span>
          </>
        ) : (
          <>
            <span>Analyze Project</span>
          </>
        )}
      </button>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 font-mono-ui">
          {error.message}
        </div>
      )}

      <div id="project-path-hint" className="text-xs text-gray-500 dark:text-slate-500 space-y-2 leading-relaxed pt-2 font-mono-ui">
        <p>Absolute path to the project directory</p>
        <p className="text-gray-600 dark:text-slate-400">Example: /Users/you/projects/my-app</p>
        <p className="flex items-center gap-2 mt-3">
          <kbd className="px-2 py-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded text-[10px] font-mono-ui">⌘K</kbd>
          <span>focuses search after analysis</span>
        </p>
      </div>
    </div>
  )
}
