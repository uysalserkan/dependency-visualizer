import { useState } from 'react'
import { FolderOpen, GitBranch, Loader2 } from 'lucide-react'
import { useAnalyzeProject, useAnalyzeRepository } from '@/hooks/useAnalysis'
import { useGraphStore } from '@/stores/graphStore'
import { cn } from '@/lib/utils'

type SourceType = 'local' | 'git'

export function SourceAnalyzer() {
  const [sourceType, setSourceType] = useState<SourceType>('local')
  const [projectPath, setProjectPath] = useState('')
  const [repositoryUrl, setRepositoryUrl] = useState('')
  const [branch, setBranch] = useState('')

  const setAnalysis = useGraphStore((state) => state.setAnalysis)
  const { mutate: analyzeProject, isPending: isPendingLocal, error: errorLocal } = useAnalyzeProject()
  const { mutate: analyzeRepository, isPending: isPendingRepo, error: errorRepo } = useAnalyzeRepository()

  const isPending = isPendingLocal || isPendingRepo
  const error = sourceType === 'local' ? errorLocal : errorRepo

  const handleAnalyze = () => {
    if (sourceType === 'local') {
      if (!projectPath.trim()) return
      analyzeProject(
        { project_path: projectPath.trim() },
        { onSuccess: (data) => setAnalysis(data) }
      )
    } else {
      if (!repositoryUrl.trim()) return
      analyzeRepository(
        {
          repository_url: repositoryUrl.trim(),
          branch: branch.trim() || undefined,
        },
        { onSuccess: (data) => setAnalysis(data) }
      )
    }
  }

  const canAnalyze =
    sourceType === 'local' ? projectPath.trim().length > 0 : repositoryUrl.trim().length > 0

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAnalyze()
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/5 backdrop-blur-md bg-white/80 dark:bg-slate-900/50 p-6 space-y-6">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Source</h3>
        <div
          role="tablist"
          aria-label="Source type"
          className="flex rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-slate-800/50 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={sourceType === 'local'}
            onClick={() => setSourceType('local')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all',
              sourceType === 'local'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <FolderOpen className="w-4 h-4 shrink-0" aria-hidden />
            <span>Local path</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={sourceType === 'git'}
            onClick={() => setSourceType('git')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all',
              sourceType === 'git'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <GitBranch className="w-4 h-4 shrink-0" aria-hidden />
            <span>Git repository</span>
          </button>
        </div>
      </div>

      {sourceType === 'local' ? (
        <div className="space-y-3">
          <label
            htmlFor="source-project-path"
            className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-slate-400"
          >
            <span>Project path</span>
          </label>
          <input
            id="source-project-path"
            type="text"
            value={projectPath}
            onChange={(e) => setProjectPath(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="/path/to/your/project"
            aria-label="Project directory path"
            aria-describedby="source-hint"
            className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 transition-all font-mono text-sm"
            disabled={isPending}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <label
            htmlFor="source-repository-url"
            className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-slate-400"
          >
            <span>Repository URL</span>
          </label>
          <input
            id="source-repository-url"
            type="url"
            value={repositoryUrl}
            onChange={(e) => setRepositoryUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://github.com/owner/repo"
            aria-label="Git repository URL (HTTPS)"
            className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 transition-all font-mono text-sm"
            disabled={isPending}
          />
          <label
            htmlFor="source-branch"
            className="block text-sm font-medium text-gray-600 dark:text-slate-400"
          >
            Branch, tag, or commit (optional)
          </label>
          <input
            id="source-branch"
            type="text"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="main"
            aria-label="Branch, tag, or commit"
            className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 transition-all font-mono text-sm"
            disabled={isPending}
          />
        </div>
      )}

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={isPending || !canAnalyze}
        aria-busy={isPending}
        aria-label={
          isPending
            ? sourceType === 'git'
              ? 'Cloning and analyzing'
              : 'Analyzing project'
            : 'Analyze'
        }
        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-indigo-500 text-white font-semibold rounded-xl hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-950"
      >
        {isPending ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
            <span>{sourceType === 'git' ? 'Cloning & analyzing...' : 'Analyzing...'}</span>
          </>
        ) : (
          <span>{sourceType === 'git' ? 'Clone & analyze' : 'Analyze'}</span>
        )}
      </button>

      {error && (
        <div
          className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 font-mono"
          role="alert"
        >
          {error.message}
        </div>
      )}

      <div id="source-hint" className="text-xs text-gray-500 dark:text-slate-500 space-y-2 leading-relaxed pt-2 font-mono">
        {sourceType === 'local' ? (
          <>
            <p>Absolute path to the project directory</p>
            <p className="text-gray-600 dark:text-slate-400">Example: /Users/you/projects/my-app</p>
            <p className="flex items-center gap-2 mt-3">
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded text-[10px]">
                ⌘K
              </kbd>
              <span>focuses search after analysis</span>
            </p>
          </>
        ) : (
          <>
            <p>HTTPS only. GitHub, GitLab, Bitbucket, Gitea, Codeberg.</p>
            <p className="text-gray-600 dark:text-slate-400">Example: https://github.com/owner/repo</p>
          </>
        )}
      </div>
    </div>
  )
}
