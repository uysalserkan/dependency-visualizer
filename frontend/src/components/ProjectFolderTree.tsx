import { useMemo, useState } from 'react'
import { ChevronRight, ChevronDown, FileCode, Folder, FolderOpen } from 'lucide-react'
import { useGraphStore } from '@/stores/graphStore'
import { cn } from '@/lib/utils'
import type { Node } from '@/types/api'

interface TreeNode {
  name: string
  path: string
  children: Map<string, TreeNode>
  node: Node | null
}

function buildTree(nodes: Node[], projectPath: string): TreeNode {
  const root: TreeNode = { name: '', path: '', children: new Map(), node: null }
  const normalize = (p: string) => p.replace(/\\/g, '/').replace(/\/+/g, '/')
  const stripPrefix = (p: string) => {
    const n = normalize(p)
    const base = normalize(projectPath).replace(/\/$/, '')
    if (base && (n === base || n.startsWith(base + '/'))) return n.slice(base.length).replace(/^\//, '') || n
    return n
  }

  for (const node of nodes) {
    if (node.node_type !== 'module') continue
    const relative = stripPrefix(node.file_path)
    const parts = relative.split('/').filter(Boolean)
    if (parts.length === 0) continue
    let current = root
    for (let i = 0; i < parts.length; i++) {
      const key = parts[i]
      const isFile = i === parts.length - 1
      if (!current.children.has(key)) {
        current.children.set(key, {
          name: key,
          path: parts.slice(0, i + 1).join('/'),
          children: new Map(),
          node: isFile ? node : null,
        })
      }
      const next = current.children.get(key)!
      if (isFile) next.node = node
      current = next
    }
  }
  return root
}

function sortTreeNodes(map: Map<string, TreeNode>): TreeNode[] {
  const list = Array.from(map.values())
  list.sort((a, b) => {
    const aIsDir = a.children.size > 0 || !a.node
    const bIsDir = b.children.size > 0 || !b.node
    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })
  return list
}

function TreeItem({
  node,
  depth,
  selectedNode,
  onSelect,
  defaultOpen,
}: {
  node: TreeNode
  depth: number
  selectedNode: Node | null
  onSelect: (n: Node | null) => void
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const hasChildren = node.children.size > 0
  const isDir = hasChildren || !node.node
  const isSelected = selectedNode?.id === node.node?.id
  const sorted = useMemo(() => sortTreeNodes(node.children), [node.children])

  if (node.name === '') {
    return (
      <>
        {sortTreeNodes(node.children).map((child) => (
          <TreeItem
            key={child.path || child.name}
            node={child}
            depth={depth}
            selectedNode={selectedNode}
            onSelect={onSelect}
            defaultOpen={defaultOpen}
          />
        ))}
      </>
    )
  }

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-center gap-1.5 py-1 pr-2 rounded-md cursor-pointer text-sm transition-colors',
          'hover:bg-gray-100 dark:hover:bg-white/10',
          isSelected && 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
        )}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
        onClick={() => {
          if (isDir) setOpen((o) => !o)
          else if (node.node) onSelect(node.node)
        }}
        role={isDir ? 'button' : 'button'}
        aria-expanded={isDir ? open : undefined}
      >
        {isDir ? (
          <span className="shrink-0 w-4 flex items-center justify-center text-gray-500 dark:text-slate-400">
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </span>
        ) : (
          <span className="shrink-0 w-4" />
        )}
        <span className="shrink-0 text-gray-500 dark:text-slate-400">
          {isDir ? (
            open ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />
          ) : (
            <FileCode className="w-4 h-4" />
          )}
        </span>
        <span className={cn('truncate font-mono text-xs', isSelected && 'font-medium')} title={node.path || node.name}>
          {node.name}
        </span>
      </div>
      {isDir && open && (
        <div>
          {sorted.map((child) => (
            <TreeItem
              key={child.path || child.name}
              node={child}
              depth={depth + 1}
              selectedNode={selectedNode}
              onSelect={onSelect}
              defaultOpen={defaultOpen}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function ProjectFolderTree() {
  const analysis = useGraphStore((s) => s.analysis)
  const selectedNode = useGraphStore((s) => s.selectedNode)
  const setSelectedNode = useGraphStore((s) => s.setSelectedNode)

  const root = useMemo(() => {
    if (!analysis?.nodes) return null
    return buildTree(analysis.nodes, analysis.project_path)
  }, [analysis?.nodes, analysis?.project_path])

  if (!analysis || !root) return null

  const fileCount = analysis.nodes.filter((n) => n.node_type === 'module').length
  if (fileCount === 0) return null

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/5 backdrop-blur-md bg-white/80 dark:bg-slate-900/50 overflow-hidden">
      <div className="px-3 py-2.5 border-b border-gray-200 dark:border-white/5 bg-gray-50/80 dark:bg-slate-800/50">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">Project files</h2>
        <p className="text-xs text-gray-500 dark:text-slate-500 mt-0.5 font-mono">{fileCount} files</p>
      </div>
      <div className="max-h-[280px] overflow-y-auto p-1.5" role="tree" aria-label="Project folder tree">
        <TreeItem
          node={root}
          depth={0}
          selectedNode={selectedNode}
          onSelect={setSelectedNode}
          defaultOpen={true}
        />
      </div>
    </div>
  )
}
