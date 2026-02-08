import { useState } from 'react'
import { FileArchive, Folder, GitBranch, Github, Link, Loader2, Terminal } from 'lucide-react'
import { useAnalyzeProject, useAnalyzeRepository, useAnalyzeZip } from '@/hooks/useAnalysis'
import { useGraphStore } from '@/stores/graphStore'
import { cn } from '@/lib/utils'

type SourceType = 'local' | 'git' | 'zip'

interface SourceAnalyzerProps {
  /** Called after a successful analyze (e.g. to close a modal). */
  onSuccessCallback?: () => void
}

export function SourceAnalyzer({ onSuccessCallback }: SourceAnalyzerProps = {}) {
  const [sourceType, setSourceType] = useState<SourceType>('local')
  const [projectPath, setProjectPath] = useState('')
  const [repositoryUrl, setRepositoryUrl] = useState('')
  const [branch, setBranch] = useState('')
  const [zipFile, setZipFile] = useState<File | null>(null)

  const setAnalysis = useGraphStore((state) => state.setAnalysis)
  const { mutate: analyzeProject, isPending: isPendingLocal, error: errorLocal } = useAnalyzeProject()
  const { mutate: analyzeRepository, isPending: isPendingRepo, error: errorRepo } = useAnalyzeRepository()
  const { mutate: analyzeZip, isPending: isPendingZip, error: errorZip } = useAnalyzeZip()

  const isPending = isPendingLocal || isPendingRepo || isPendingZip
  const error =
    sourceType === 'local' ? errorLocal : sourceType === 'git' ? errorRepo : errorZip

  const handleAnalyze = () => {
    const onSuccess = () => {
      onSuccessCallback?.()
    }
    if (sourceType === 'local') {
      if (!projectPath.trim()) return
      analyzeProject(
        { project_path: projectPath.trim() },
        { onSuccess: (data) => { setAnalysis(data); onSuccess() } },
      )
    } else if (sourceType === 'git') {
      if (!repositoryUrl.trim()) return
      analyzeRepository(
        {
          repository_url: repositoryUrl.trim(),
          branch: branch.trim() || undefined,
        },
        { onSuccess: (data) => { setAnalysis(data); onSuccess() } },
      )
    } else {
      if (!zipFile) return
      analyzeZip(zipFile, { onSuccess: (data) => { setAnalysis(data); onSuccess() } })
    }
  }

  const canAnalyze =
    sourceType === 'local'
      ? projectPath.trim().length > 0
      : sourceType === 'git'
        ? repositoryUrl.trim().length > 0
        : zipFile != null

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAnalyze()
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 backdrop-blur-md bg-gray-50 dark:bg-white/5 p-6 space-y-6">
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-gray-600 dark:text-white/70 uppercase tracking-widest">Source</h3>
        <div
          role="tablist"
          aria-label="Source type"
          className="flex rounded-xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-black/20 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={sourceType === 'local'}
            onClick={() => setSourceType('local')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all duration-200',
              sourceType === 'local'
                ? 'bg-indigo-100 dark:bg-white/10 text-indigo-700 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <Folder className="w-4 h-4 shrink-0" aria-hidden />
            <span>Local</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={sourceType === 'git'}
            onClick={() => setSourceType('git')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all duration-200',
              sourceType === 'git'
                ? 'bg-indigo-100 dark:bg-white/10 text-indigo-700 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <Github className="w-4 h-4 shrink-0" aria-hidden />
            <span>Git</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={sourceType === 'zip'}
            onClick={() => setSourceType('zip')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all duration-200',
              sourceType === 'zip'
                ? 'bg-indigo-100 dark:bg-white/10 text-indigo-700 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <FileArchive className="w-4 h-4 shrink-0" aria-hidden />
            <span>ZIP</span>
          </button>
        </div>
      </div>

      {sourceType === 'local' ? (
        <div className="space-y-3">
          <label
            htmlFor="source-project-path"
            className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-white/60 uppercase tracking-wide"
          >
            <span>Project path</span>
          </label>
          <div className="relative">
            <Terminal className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/40" aria-hidden />
            <input
              id="source-project-path"
              type="text"
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="/path/to/your/project"
              aria-label="Project directory path"
              aria-describedby="source-hint"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-black/40 text-gray-900 dark:text-white/90 placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-mono text-sm disabled:opacity-60"
              disabled={isPending}
            />
          </div>
        </div>
      ) : sourceType === 'git' ? (
        <div className="space-y-3">
          <label
            htmlFor="source-repository-url"
            className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-white/60 uppercase tracking-wide"
          >
            <span>Repository URL</span>
          </label>
          <div className="relative">
            <Link className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/40" aria-hidden />
            <input
              id="source-repository-url"
              type="url"
              value={repositoryUrl}
              onChange={(e) => setRepositoryUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="https://github.com/owner/repo"
              aria-label="Git repository URL (HTTPS)"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-black/40 text-gray-900 dark:text-white/90 placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-mono text-sm disabled:opacity-60"
              disabled={isPending}
            />
          </div>
          <label
            htmlFor="source-branch"
            className="block text-xs font-semibold text-gray-600 dark:text-white/60 uppercase tracking-wide"
          >
            Branch, tag, or commit (optional)
          </label>
          <div className="relative">
            <GitBranch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-white/40" aria-hidden />
            <input
              id="source-branch"
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="main"
              aria-label="Branch, tag, or commit"
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-black/40 text-gray-900 dark:text-white/90 placeholder:text-gray-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-mono text-sm disabled:opacity-60"
              disabled={isPending}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <label
            htmlFor="source-zip-file"
            className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-white/60 uppercase tracking-wide"
          >
            <span>ZIP archive</span>
          </label>
          <input
            id="source-zip-file"
            type="file"
            accept=".zip"
            onChange={(e) => setZipFile(e.target.files?.[0] ?? null)}
            aria-label="Select .zip project archive"
            className="w-full px-4 py-3 rounded-xl bg-white dark:bg-black/40 text-gray-900 dark:text-white/90 focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-mono text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-gray-200 dark:file:bg-white/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-wide file:text-gray-700 dark:file:text-white/80 hover:file:bg-gray-300 dark:hover:file:bg-white/20 disabled:opacity-60"
            disabled={isPending}
          />
          {zipFile && (
            <p className="text-xs text-gray-600 dark:text-white/50 font-mono">
              {zipFile.name}
            </p>
          )}
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
              : sourceType === 'zip'
                ? 'Analyzing ZIP'
                : 'Analyzing project'
            : 'Analyze'
        }
        className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-gradient-to-r from-purple-500/90 to-blue-500/90 text-white font-semibold shadow-lg shadow-purple-500/20 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500/60"
      >
        {isPending ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
            <span>
              {sourceType === 'git'
                ? 'Cloning & analyzing...'
                : sourceType === 'zip'
                  ? 'Analyzing ZIP...'
                  : 'Analyzing...'}
            </span>
          </>
        ) : (
          <span>
            {sourceType === 'git' ? 'Clone & analyze' : sourceType === 'zip' ? 'Analyze ZIP' : 'Analyze'}
          </span>
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

      <div id="source-hint" className="text-xs text-gray-600 dark:text-white/40 space-y-2 leading-relaxed pt-2 font-mono">
        {sourceType === 'local' ? (
          <>
            <p>Absolute path to the project directory</p>
            <p className="text-gray-700 dark:text-white/60">Example: /Users/you/projects/my-app</p>
            <p className="flex items-center gap-2 mt-3">
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-white/10 border border-gray-300 dark:border-white/10 rounded text-[10px]">
                ⌘K
              </kbd>
              <span>focuses search after analysis</span>
            </p>
          </>
        ) : sourceType === 'git' ? (
          <>
            <p>HTTPS only. GitHub, GitLab, Bitbucket, Gitea, Codeberg.</p>
            <p className="text-gray-700 dark:text-white/60">Example: https://github.com/owner/repo</p>
          </>
        ) : (
          <>
            <p>Upload a .zip of your project directory (e.g. from Finder or Explorer).</p>
            <p className="text-gray-700 dark:text-white/60">Max 100 MB compressed, 500 MB uncompressed.</p>
          </>
        )}
      </div>
    </div>
  )
}
