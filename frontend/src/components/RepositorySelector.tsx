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
    <div className="glass dark:glass rounded-2xl border dark:border-white/10 p-8 space-y-6 glass-hover">
      <div className="space-y-3">
        <label
          htmlFor="repository-url"
          className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          <GitBranch className="w-4 h-4 text-emerald-500" aria-hidden />
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
          className="w-full px-4 py-3 bg-white/5 dark:bg-white/5 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all backdrop-blur-xl"
          disabled={isPending}
        />
      </div>

      <div className="space-y-3">
        <label
          htmlFor="repository-branch"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
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
          className="w-full px-4 py-3 bg-white/5 dark:bg-white/5 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all backdrop-blur-xl"
          disabled={isPending}
        />
      </div>

      <button
        type="button"
        onClick={handleAnalyze}
        disabled={isPending || !repositoryUrl.trim()}
        aria-busy={isPending}
        aria-label={isPending ? 'Cloning and analyzing repository' : 'Analyze from Git'}
        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-emerald-500/20 glow-primary-hover focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-950"
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
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          {error.message}
        </div>
      )}

      <div
        id="repository-url-hint"
        className="text-xs text-gray-500 dark:text-gray-500 space-y-2 leading-relaxed pt-2"
      >
        <p>HTTPS URL only. Supported: GitHub, GitLab, Bitbucket, Gitea, Codeberg.</p>
        <p className="font-medium text-gray-600 dark:text-gray-400">
          Example: https://github.com/owner/repo
        </p>
      </div>
    </div>
  )
}
