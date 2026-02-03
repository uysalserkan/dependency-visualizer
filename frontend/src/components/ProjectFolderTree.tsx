import { useMemo, useState } from 'react'
import { ChevronRight, ChevronDown, FileCode, Folder, FolderOpen, FolderTree, Focus } from 'lucide-react'
import { useGraphStore } from '@/stores/graphStore'
import { cn } from '@/lib/utils'
import { getRelativePath } from '@/lib/pathUtils'
import type { Node } from '@/types/api'

interface TreeNode {
  name: string
  path: string
  children: Map<string, TreeNode>
  node: Node | null
}

function buildTree(nodes: Node[], projectPath: string): TreeNode {
  const root: TreeNode = { name: '', path: '', children: new Map(), node: null }

  for (const node of nodes) {
    if (node.node_type !== 'module') continue
    const relative = getRelativePath(node.file_path, projectPath)
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
  selectedFolderPath,
  onSelect,
  onSelectFolder,
  defaultOpen,
}: {
  node: TreeNode
  depth: number
  selectedNode: Node | null
  selectedFolderPath: string | null
  onSelect: (n: Node | null) => void
  onSelectFolder: (path: string | null) => void
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const hasChildren = node.children.size > 0
  const isDir = hasChildren || !node.node
  const isSelected = selectedNode?.id === node.node?.id
  const isFolderSelected = isDir && node.path === selectedFolderPath
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
            selectedFolderPath={selectedFolderPath}
            onSelect={onSelect}
            onSelectFolder={onSelectFolder}
            defaultOpen={defaultOpen}
          />
        ))}
      </>
    )
  }

  const handleRowClick = () => {
    if (isDir) {
      setOpen((o) => !o)
    } else if (node.node) {
      onSelect(node.node)
    }
  }

  const handleSelectFolderClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (node.path === selectedFolderPath) {
      onSelectFolder(null)
    } else {
      onSelectFolder(node.path)
    }
  }

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-center gap-2 cursor-pointer text-sm transition-all duration-150 group/folder',
          isDir
            ? cn(
                'py-1.5 px-2 rounded-md text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-white/[0.04] hover:text-gray-900 dark:hover:text-slate-200',
                isFolderSelected && 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-l-2 border-indigo-500 dark:border-indigo-400'
              )
            : cn(
                'py-2 px-2 rounded-lg group',
                'hover:bg-gray-100/80 dark:hover:bg-white/[0.06]',
                isSelected && 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-l-2 border-indigo-500 dark:border-indigo-400'
              )
        )}
        style={{ paddingLeft: `${depth * 14 + 10}px` }}
        onClick={handleRowClick}
        role={isDir ? 'button' : 'button'}
        aria-expanded={isDir ? open : undefined}
      >
        {isDir ? (
          <span className="shrink-0 w-5 flex items-center justify-center text-gray-400 dark:text-slate-500">
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>
        ) : (
          <span className="shrink-0 w-5" aria-hidden />
        )}
        <span
          className={cn(
            'shrink-0',
            isDir ? 'text-amber-500/90 dark:text-amber-400/80' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors'
          )}
        >
          {isDir ? (
            open ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />
          ) : (
            <FileCode className="w-4 h-4" />
          )}
        </span>
        <span
          className={cn(
            'truncate text-xs transition-colors flex-1 min-w-0',
            isDir ? 'font-medium' : isSelected ? 'font-semibold text-gray-900 dark:text-white' : 'font-medium text-gray-700 dark:text-slate-300'
          )}
          title={node.path || node.name}
        >
          {node.name}
        </span>
        {isDir && (
          <button
            type="button"
            onClick={handleSelectFolderClick}
            className={cn(
              'shrink-0 p-1 rounded-md transition-colors',
              'text-gray-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/20',
              isFolderSelected && 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 dark:bg-indigo-500/20'
            )}
            title={isFolderSelected ? 'Show full project graph' : 'Show graph for this folder'}
            aria-label={isFolderSelected ? 'Show full project graph' : 'Show graph for this folder'}
          >
            <Focus className="w-3.5 h-3.5" aria-hidden />
          </button>
        )}
      </div>
      {isDir && open && (
        <div>
          {sorted.map((child) => (
            <TreeItem
              key={child.path || child.name}
              node={child}
              depth={depth + 1}
              selectedNode={selectedNode}
              selectedFolderPath={selectedFolderPath}
              onSelect={onSelect}
              onSelectFolder={onSelectFolder}
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
  const selectedFolderPath = useGraphStore((s) => s.selectedFolderPath)
  const setSelectedNode = useGraphStore((s) => s.setSelectedNode)
  const setSelectedFolderPath = useGraphStore((s) => s.setSelectedFolderPath)

  const root = useMemo(() => {
    if (!analysis?.nodes) return null
    return buildTree(analysis.nodes, analysis.project_path)
  }, [analysis?.nodes, analysis?.project_path])

  if (!analysis || !root) return null

  const fileCount = analysis.nodes.filter((n) => n.node_type === 'module').length
  if (fileCount === 0) return null

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/5 bg-white/80 dark:bg-slate-900/50 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200/80 dark:border-white/5 bg-gradient-to-r from-gray-50 to-white dark:from-slate-800/80 dark:to-slate-900/50">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/20 dark:border-indigo-500/30">
          <FolderTree className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white tracking-tight">Project files</h2>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 tabular-nums">{fileCount} files</p>
        </div>
      </div>
      <div
        className="max-h-[280px] overflow-y-auto overflow-x-hidden py-2 px-2"
        role="tree"
        aria-label="Project folder tree"
      >
        <TreeItem
          node={root}
          depth={0}
          selectedNode={selectedNode}
          selectedFolderPath={selectedFolderPath}
          onSelect={setSelectedNode}
          onSelectFolder={setSelectedFolderPath}
          defaultOpen={true}
        />
      </div>
    </div>
  )
}
