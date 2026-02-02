import { useQuery } from '@tanstack/react-query'
import { TrendingUp, AlertTriangle, CheckCircle, Info, Award } from 'lucide-react'
import { api } from '@/lib/api'
import { useGraphStore } from '@/stores/graphStore'

export function InsightsPanel() {
  const analysis = useGraphStore((state) => state.analysis)

  const { data: insights, isLoading } = useQuery({
    queryKey: ['insights', analysis?.id],
    queryFn: () => (analysis ? api.getInsights(analysis.id) : null),
    enabled: !!analysis,
  })

  if (!analysis || isLoading) return null

  if (!insights) return null

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-300'
      case 'good':
        return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-300'
      case 'fair':
        return 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-300'
      case 'poor':
        return 'from-red-500/20 to-rose-500/20 border-red-500/30 text-red-300'
      default:
        return 'from-gray-500/20 to-slate-500/20 border-gray-500/30 text-gray-300'
    }
  }

  const getSeverityIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      default:
        return <Info className="w-4 h-4 text-blue-500" />
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/5 backdrop-blur-md bg-white/80 dark:bg-slate-900/50 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">Project Health</h2>
        <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5 flex items-center justify-center">
          <Award className="w-4 h-4 text-gray-500 dark:text-slate-400" aria-hidden />
        </div>
      </div>

      {/* Health Score with gradient background */}
      <div className={`p-6 rounded-xl border bg-gradient-to-br backdrop-blur-xl ${getHealthColor(insights.health_status)}`}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium">Health Score</span>
          <span className="text-4xl font-bold">{insights.health_score}/100</span>
        </div>
        <div className="w-full bg-black/20 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 rounded-full transition-all duration-500 bg-current"
            style={{
              width: `${insights.health_score}%`,
            }}
          />
        </div>
        <div className="mt-4 text-sm font-semibold capitalize">{insights.health_status}</div>
      </div>

      {/* Insights */}
      {insights.insights.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Insights</h3>
          {insights.insights.map((insight, i) => (
            <div key={i} className="flex gap-3 p-4 bg-white/5 rounded-xl border border-white/10 backdrop-blur-xl">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                {getSeverityIcon(insight.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{insight.title}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{insight.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {insights.recommendations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Recommendations</h3>
          {insights.recommendations.slice(0, 3).map((rec, i) => (
            <div key={i} className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 backdrop-blur-xl">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 dark:text-blue-300 mb-1">{rec.title}</div>
                  <div className="text-xs text-gray-700 dark:text-blue-300/80 leading-relaxed mb-2">{rec.description}</div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/20 border border-blue-500/30">
                    <span className="text-[10px] text-blue-400 font-medium uppercase tracking-wider">
                      {rec.priority} priority
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
