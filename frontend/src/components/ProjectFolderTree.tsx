import { useMemo, useState } from 'react'
import { ChevronRight, ChevronDown, FileCode, Folder, FolderMinus, FolderOpen, FolderPlus, FolderTree, Focus } from 'lucide-react'
import { useGraphStore } from '@/stores/graphStore'
import { cn } from '@/lib/utils'
import { getRelativePath } from '@/lib/pathUtils'
import { getFolderPath } from '@/lib/folderGroups'
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

  // Flatten single root directory if it's the only thing at the root
  let currentRoot = root
  while (currentRoot.children.size === 1) {
    const onlyChildName = Array.from(currentRoot.children.keys())[0]
    const onlyChild = currentRoot.children.get(onlyChildName)!
    if (onlyChild.children.size > 0 || !onlyChild.node) {
      // It's a directory, so we can flatten it
      currentRoot = onlyChild
    } else {
      break
    }
  }

  return currentRoot
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
  collapsedFolders,
  folderPathsWithFiles,
  onSelect,
  onSelectFolder,
  onCollapseInGraph,
  defaultOpen,
}: {
  node: TreeNode
  depth: number
  selectedNode: Node | null
  selectedFolderPath: string | null
  collapsedFolders: string[]
  folderPathsWithFiles: Set<string>
  onSelect: (n: Node | null) => void
  onSelectFolder: (path: string | null) => void
  onCollapseInGraph: (folderPath: string, collapsed: boolean) => void
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const hasChildren = node.children.size > 0
  const isDir = hasChildren || !node.node
  const isSelected = selectedNode?.id === node.node?.id
  const isFolderSelected = isDir && node.path === selectedFolderPath
  const isCollapsedInGraph = isDir && collapsedFolders.includes(node.path)
  const canCollapseInGraph = isDir && folderPathsWithFiles.has(node.path)
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
            collapsedFolders={collapsedFolders}
            folderPathsWithFiles={folderPathsWithFiles}
            onSelect={onSelect}
            onSelectFolder={onSelectFolder}
            onCollapseInGraph={onCollapseInGraph}
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

  const handleCollapseInGraphClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onCollapseInGraph(node.path, !isCollapsedInGraph)
  }

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-center gap-1.5 cursor-pointer text-sm transition-colors duration-100 group/row rounded-md',
          'py-1.5 pr-1.5',
          isDir
            ? cn(
              'text-gray-600 dark:text-slate-400 hover:bg-gray-100/80 dark:hover:bg-white/[0.06] hover:text-gray-900 dark:hover:text-slate-200',
              isFolderSelected && 'bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-l-2 border-indigo-500 dark:border-indigo-400'
            )
            : cn(
              'text-gray-700 dark:text-slate-300 hover:bg-gray-100/80 dark:hover:bg-white/[0.06]',
              isSelected && 'bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-l-2 border-indigo-500 dark:border-indigo-400 font-medium'
            )
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={handleRowClick}
        role={isDir ? 'button' : 'button'}
        aria-expanded={isDir ? open : undefined}
      >
        {isDir ? (
          <span className="shrink-0 w-4 flex items-center justify-center text-gray-400 dark:text-slate-500">
            {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </span>
        ) : (
          <span className="shrink-0 w-4" aria-hidden />
        )}
        <span
          className={cn(
            'shrink-0 flex items-center',
            isDir ? 'text-amber-600/90 dark:text-amber-400/90' : 'text-slate-500 dark:text-slate-400'
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
            'truncate text-xs flex-1 min-w-0 font-mono-ui',
            isDir ? 'font-medium' : isSelected ? 'font-semibold text-gray-900 dark:text-white' : 'font-normal'
          )}
          title={node.path || node.name}
        >
          {node.name}
        </span>
        {isDir && canCollapseInGraph && (
          <button
            type="button"
            onClick={handleCollapseInGraphClick}
            className={cn(
              'shrink-0 p-1 rounded transition-colors opacity-0 group-hover/row:opacity-100 focus:opacity-100',
              'text-gray-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 dark:hover:bg-amber-500/20',
              isCollapsedInGraph && 'opacity-100 text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20'
            )}
            title={isCollapsedInGraph ? 'Expand folder in graph' : 'Collapse folder in graph'}
            aria-label={isCollapsedInGraph ? 'Expand folder in graph' : 'Collapse folder in graph'}
          >
            {isCollapsedInGraph ? (
              <FolderPlus className="w-3.5 h-3.5" aria-hidden />
            ) : (
              <FolderMinus className="w-3.5 h-3.5" aria-hidden />
            )}
          </button>
        )}
        {isDir && (
          <>
            <button
              type="button"
              onClick={handleSelectFolderClick}
              className={cn(
                'shrink-0 p-1 rounded transition-colors opacity-0 group-hover/row:opacity-100 focus:opacity-100',
                'text-gray-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/20',
                isFolderSelected && 'opacity-100 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 dark:bg-indigo-500/20'
              )}
              title={isFolderSelected ? 'Show full project graph' : 'Show graph for this folder'}
              aria-label={isFolderSelected ? 'Show full project graph' : 'Show graph for this folder'}
            >
              <Focus className="w-3.5 h-3.5" aria-hidden />
            </button>
          </>
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
              collapsedFolders={collapsedFolders}
              folderPathsWithFiles={folderPathsWithFiles}
              onSelect={onSelect}
              onSelectFolder={onSelectFolder}
              onCollapseInGraph={onCollapseInGraph}
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
  const collapsedFolders = useGraphStore((s) => s.collapsedFolders)
  const setSelectedNode = useGraphStore((s) => s.setSelectedNode)
  const setSelectedFolderPath = useGraphStore((s) => s.setSelectedFolderPath)
  const setCollapsedFolder = useGraphStore((s) => s.setCollapsedFolder)
  const setCollapsedFolders = useGraphStore((s) => s.setCollapsedFolders)

  const root = useMemo(() => {
    if (!analysis?.nodes) return null
    return buildTree(analysis.nodes, analysis.root_path || analysis.project_path)
  }, [analysis?.nodes, analysis?.project_path, analysis?.root_path])

  const folderPathsWithFiles = useMemo(() => {
    if (!analysis?.nodes) return new Set<string>()
    const set = new Set<string>()
    analysis.nodes
      .filter((n) => n.node_type === 'module')
      .forEach((n) => {
        set.add(getFolderPath(getRelativePath(n.file_path, analysis.root_path || analysis.project_path)))
      })
    return set
  }, [analysis?.nodes, analysis?.project_path, analysis?.root_path])

  if (!analysis || !root) return null

  const fileCount = analysis.nodes.filter((n) => n.node_type === 'module').length
  if (fileCount === 0) return null

  return (
    <div className="flex flex-1 flex-col min-h-0 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white/60 dark:bg-slate-900/40 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-gray-200/60 dark:border-white/5 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FolderTree className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden />
          <h2 className="text-xs font-semibold text-gray-800 dark:text-slate-200 tracking-tight truncate">
            Project files
          </h2>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() =>
              setCollapsedFolders(
                collapsedFolders.length === 0 ? Array.from(folderPathsWithFiles) : []
              )
            }
            className="p-1.5 rounded-md text-gray-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10 dark:hover:bg-amber-500/20 transition-colors"
            title={
              collapsedFolders.length === 0
                ? 'Collapse all folders in graph'
                : 'Expand all folders in graph'
            }
            aria-label={
              collapsedFolders.length === 0
                ? 'Collapse all folders in graph'
                : 'Expand all folders in graph'
            }
          >
            {collapsedFolders.length === 0 ? (
              <FolderMinus className="w-3.5 h-3.5" aria-hidden />
            ) : (
              <FolderPlus className="w-3.5 h-3.5" aria-hidden />
            )}
          </button>
          <span
            className="text-[11px] font-medium tabular-nums text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-md"
            title={`${fileCount} files`}
          >
            {fileCount}
          </span>
        </div>
      </div>
      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-1.5 px-1.5"
        role="tree"
        aria-label="Project folder tree"
      >
        <TreeItem
          node={root}
          depth={0}
          selectedNode={selectedNode}
          selectedFolderPath={selectedFolderPath}
          collapsedFolders={collapsedFolders}
          folderPathsWithFiles={folderPathsWithFiles}
          onSelect={setSelectedNode}
          onSelectFolder={setSelectedFolderPath}
          onCollapseInGraph={setCollapsedFolder}
          defaultOpen={true}
        />
      </div>
    </div>
  )
}
