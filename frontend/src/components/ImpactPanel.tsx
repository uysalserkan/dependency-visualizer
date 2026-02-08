import { useQuery } from '@tanstack/react-query'
import {
    AlertTriangle,
    ArrowDown,
    ArrowUp,
    ChevronRight,
    Shield,
    Target,
    Zap
} from 'lucide-react'
import { api } from '@/lib/api'
import type { AffectedFile, ImpactReport } from '@/types/api'
import { useGraphStore } from '@/stores/graphStore'

interface ImpactPanelProps {
    filePath: string | null
    onFileClick?: (filePath: string) => void
}

function RiskBadge({ level }: { level: ImpactReport['risk_level'] }) {
    const styles = {
        low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
        critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    }

    return (
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full uppercase ${styles[level]}`}>
            {level}
        </span>
    )
}

function ImpactScore({ score }: { score: number }) {
    const color =
        score >= 70 ? 'text-red-500' :
            score >= 40 ? 'text-orange-500' :
                score >= 15 ? 'text-yellow-500' :
                    'text-green-500'

    return (
        <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${color}`} />
            <span className={`text-2xl font-bold ${color}`}>{score.toFixed(0)}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">/100</span>
        </div>
    )
}

function AffectedFileList({
    files,
    title,
    icon: Icon,
    onFileClick
}: {
    files: AffectedFile[]
    title: string
    icon: React.ComponentType<{ className?: string }>
    onFileClick?: (filePath: string) => void
}) {
    if (files.length === 0) return null

    return (
        <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <Icon className="w-3.5 h-3.5" />
                {title} ({files.length})
            </h4>
            <ul className="space-y-1 max-h-40 overflow-y-auto">
                {files.slice(0, 10).map((file) => (
                    <li
                        key={file.file_path}
                        className="flex items-center justify-between p-2 text-xs rounded-md bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                        onClick={() => onFileClick?.(file.file_path)}
                    >
                        <span className="truncate flex-1 text-slate-700 dark:text-slate-300">
                            {file.file_path.split('/').pop()}
                        </span>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${file.impact_type === 'direct'
                                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                }`}>
                                {file.distance === 1 ? 'direct' : `+${file.distance}`}
                            </span>
                        </div>
                    </li>
                ))}
                {files.length > 10 && (
                    <li className="text-xs text-gray-500 dark:text-gray-400 text-center py-1">
                        +{files.length - 10} more files
                    </li>
                )}
            </ul>
        </div>
    )
}

function DependencyChain({ chain }: { chain: string[] }) {
    return (
        <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 overflow-x-auto py-1">
            {chain.map((node, i) => (
                <span key={i} className="flex items-center gap-1 shrink-0">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded truncate max-w-[100px]">
                        {node.split('/').pop()}
                    </span>
                    {i < chain.length - 1 && <ChevronRight className="w-3 h-3 text-gray-400" />}
                </span>
            ))}
        </div>
    )
}

export function ImpactPanel({ filePath, onFileClick }: ImpactPanelProps) {
    const analysis = useGraphStore((state) => state.analysis)

    const { data: impact, isLoading, error } = useQuery({
        queryKey: ['impact', analysis?.id, filePath],
        queryFn: () => (analysis && filePath ? api.getImpact(analysis.id, filePath) : null),
        enabled: !!analysis && !!filePath,
        staleTime: 30000,
    })

    if (!filePath) {
        return (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>Select a file to analyze its impact</p>
            </div>
        )
    }

    if (isLoading) {
        return (
            <div className="p-4 space-y-3">
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            </div>
        )
    }

    if (error || !impact) {
        return (
            <div className="p-4 text-center text-sm text-red-500 dark:text-red-400">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                <p>Failed to analyze impact</p>
            </div>
        )
    }

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                        Impact Analysis
                    </h3>
                </div>
                <RiskBadge level={impact.risk_level} />
            </div>

            {/* Target File */}
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Analyzing</p>
                <p className="text-sm text-indigo-900 dark:text-indigo-200 truncate font-mono">
                    {impact.target_file.split('/').pop()}
                </p>
            </div>

            {/* Score & Stats */}
            <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Impact Score</p>
                    <ImpactScore score={impact.impact_score} />
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Affected Files</p>
                    <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                        {impact.affected_count}
                    </p>
                </div>
            </div>

            {/* Forward Impact (dependents) */}
            <AffectedFileList
                files={impact.forward_impact}
                title="Will Break If Changed"
                icon={ArrowUp}
                onFileClick={onFileClick}
            />

            {/* Backward Impact (dependencies) */}
            <AffectedFileList
                files={impact.backward_impact}
                title="Depends On"
                icon={ArrowDown}
                onFileClick={onFileClick}
            />

            {/* Dependency Chains */}
            {impact.dependency_chains.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Dependency Paths
                    </h4>
                    <div className="space-y-1">
                        {impact.dependency_chains.slice(0, 2).map((chain, i) => (
                            <DependencyChain key={i} chain={chain} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
