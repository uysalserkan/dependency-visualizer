import { useQuery } from '@tanstack/react-query'
import { Award, Zap, GitBranch, ArrowRightLeft, Shield, Box } from 'lucide-react'
import { api } from '@/lib/api'
import { useGraphStore } from '@/stores/graphStore'
import { RadialProgressBar } from './RadialProgressBar' // Import the new component

// A small, reusable component for each metric
function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className="text-2xl font-bold text-slate-800 dark:text-slate-200">{value}</span>
    </div>
  )
}

export function InsightsPanel() {
  const analysis = useGraphStore((state) => state.analysis)

  const { data: insights, isLoading } = useQuery({
    queryKey: ['insights', analysis?.id],
    queryFn: () => (analysis ? api.getInsights(analysis.id) : null),
    enabled: !!analysis,
  })

  if (!analysis || isLoading || !insights) {
    // Render a skeleton or loading state if you want, otherwise null is fine
    return null
  }
  
  const { health_score, health_status, summary } = insights

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 backdrop-blur-md bg-white/80 dark:bg-slate-900/50 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center shrink-0">
          <Award className="w-5 h-5 text-gray-500 dark:text-slate-400" aria-hidden />
        </div>
        <div>
          <h2 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">Code Quality</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 capitalize">{health_status}</p>
        </div>
      </div>
      
      {/* Main Score and Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        {/* Radial Progress Bar */}
        <div className="flex items-center justify-center">
          <RadialProgressBar score={health_score} />
        </div>
        
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard 
            icon={<ArrowRightLeft className="w-4 h-4" />} 
            label="Cycles" 
            value={summary.circular_dependencies} 
          />
          <StatCard 
            icon={<GitBranch className="w-4 h-4" />} 
            label="Max Depth" 
            value={summary.max_depth} 
          />
          <StatCard 
            icon={<Zap className="w-4 h-4" />} 
            label="Issues"
            value={insights.insights.length}
          />
          <StatCard 
            icon={<Box className="w-4 h-4" />} 
            label="Isolated" 
            value={summary.isolated_modules} 
          />
        </div>
      </div>

      {/* Recommendations */}
      {insights.recommendations.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Recommendations
          </h3>
          {insights.recommendations.slice(0, 2).map((rec, i) => (
            <div key={i} className="flex gap-3 text-xs text-slate-600 dark:text-slate-400 items-start p-2 rounded-md bg-slate-50 dark:bg-slate-800/50">
              <Shield className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
              <span>{rec.title}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}