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
    <div className="glass dark:glass rounded-2xl border dark:border-white/10 p-8 space-y-6 glass-hover">
      <div className="space-y-3">
        <label htmlFor="project-path" className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <FolderOpen className="w-4 h-4 text-indigo-500" aria-hidden />
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
          className="w-full px-4 py-3 bg-white/5 dark:bg-white/5 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all backdrop-blur-xl"
          disabled={isPending}
        />
      </div>

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={isPending || !projectPath.trim()}
        aria-busy={isPending}
        aria-label={isPending ? 'Analyzing project' : 'Analyze project'}
        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold rounded-xl hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-indigo-500/20 glow-primary-hover focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
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
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          {error.message}
        </div>
      )}

      <div id="project-path-hint" className="text-xs text-gray-500 dark:text-gray-500 space-y-2 leading-relaxed pt-2">
        <p>Absolute path to the project directory</p>
        <p className="font-medium text-gray-600 dark:text-gray-400">Example: /Users/you/projects/my-app</p>
        <p className="flex items-center gap-2 mt-3">
          <kbd className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] font-mono">⌘K</kbd>
          <span>focuses search after analysis</span>
        </p>
      </div>
    </div>
  )
}
