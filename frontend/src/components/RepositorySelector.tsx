import { useState } from 'react'
import { GitBranch, Loader2 } from 'lucide-react'
import { useAnalyzeRepository } from '@/hooks/useAnalysis'
import { useGraphStore } from '@/stores/graphStore'

export function RepositorySelector() {
  const [repositoryUrl, setRepositoryUrl] = useState('')
  const [branch, setBranch] = useState('')
  const { mutate: analyzeRepository, isPending, error } = useAnalyzeRepository()
  const setAnalysis = useGraphStore((state) => state.setAnalysis)

  const handleAnalyze = () => {
    if (!repositoryUrl.trim()) return

    analyzeRepository(
      {
        repository_url: repositoryUrl.trim(),
        branch: branch.trim() || undefined,
      },
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
        <label
          htmlFor="repository-url"
          className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-slate-400"
        >
          <GitBranch className="w-4 h-4 text-gray-500 dark:text-slate-500" aria-hidden />
          <span>Repository URL</span>
        </label>
        <input
          id="repository-url"
          type="url"
          value={repositoryUrl}
          onChange={(e) => setRepositoryUrl(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="https://github.com/user/repo"
          aria-label="Git repository URL (HTTPS)"
          className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 transition-all font-mono-ui text-sm"
          disabled={isPending}
        />
      </div>

      <div className="space-y-3">
        <label
          htmlFor="repository-branch"
          className="block text-sm font-medium text-gray-600 dark:text-slate-400"
        >
          Branch, tag, or commit (optional)
        </label>
        <input
          id="repository-branch"
          type="text"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="main"
          aria-label="Branch, tag, or commit"
          className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 transition-all font-mono-ui text-sm"
          disabled={isPending}
        />
      </div>

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={isPending || !repositoryUrl.trim()}
        aria-busy={isPending}
        aria-label={isPending ? 'Cloning and analyzing repository' : 'Analyze from Git'}
        className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 bg-transparent hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-950"
      >
        {isPending ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Cloning & analyzing...</span>
          </>
        ) : (
          <>
            <GitBranch className="w-5 h-5" />
            <span>Analyze from Git</span>
          </>
        )}
      </button>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 font-mono-ui">
          {error.message}
        </div>
      )}

      <div
        id="repository-url-hint"
        className="text-xs text-gray-500 dark:text-slate-500 space-y-2 leading-relaxed pt-2 font-mono-ui"
      >
        <p>HTTPS URL only. GitHub, GitLab, Bitbucket, Gitea, Codeberg.</p>
        <p className="text-gray-600 dark:text-slate-400">Example: https://github.com/owner/repo</p>
      </div>
    </div>
  )
}
