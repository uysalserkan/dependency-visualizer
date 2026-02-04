import { Handle, type NodeProps, Position } from '@xyflow/react'
import { Folder } from 'lucide-react'
import { memo } from 'react'
import { useGraphStore } from '@/stores/graphStore'
import { useThemeStore } from '@/stores/themeStore'
import { cn } from '@/lib/utils'

export interface ClusterNodeData extends Record<string, unknown> {
  folderPath: string
  label: string
  nodeCount: number
}

function ClusterNodeComponent(props: NodeProps) {
  const { data, selected } = props
  const isDark = useThemeStore((s) => s.isDark)
  const setCollapsedFolder = useGraphStore((s) => s.setCollapsedFolder)
  const d = data as ClusterNodeData
  const folderPath = d.folderPath ?? ''
  const label = d.label ?? (folderPath || '(root)')
  const nodeCount = d.nodeCount ?? 0

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCollapsedFolder(folderPath, false)
  }

  return (
    <>
      <Handle type="target" position={Position.Top} className="!border-0 !w-0 !h-0 !min-w-0 !min-h-0" />
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'flex items-center gap-2 rounded-xl border-2 border-dashed px-3 py-2 transition-all text-left min-w-[120px]',
          'bg-white/80 dark:bg-slate-800/80',
          isDark
            ? 'border-slate-500 text-slate-200 hover:border-indigo-400 hover:bg-slate-800'
            : 'border-slate-400 text-slate-800 hover:border-indigo-500 hover:bg-slate-50',
          selected && 'ring-2 ring-violet-400 ring-offset-2 ring-offset-transparent'
        )}
        title={`Click to expand folder: ${folderPath || '(root)'} (${nodeCount} module${nodeCount !== 1 ? 's' : ''})`}
      >
        <Folder
          className="w-4 h-4 shrink-0 text-amber-500 dark:text-amber-400"
          aria-hidden
        />
        <span className="flex-1 min-w-0 truncate font-mono-ui text-xs">
          {label}
        </span>
        <span
          className={cn(
            'shrink-0 text-xs font-medium tabular-nums',
            isDark ? 'text-slate-400' : 'text-slate-500'
          )}
        >
          {nodeCount}
        </span>
      </button>
      <Handle type="source" position={Position.Bottom} className="!border-0 !w-0 !h-0 !min-w-0 !min-h-0" />
    </>
  )
}

export const ClusterNode = memo(ClusterNodeComponent)
