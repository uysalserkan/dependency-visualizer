/**
 * Folder-based grouping for graph nodes. Derives folder paths from file_path,
 * groups internal nodes by folder, and computes effective nodes/edges when
 * some folders are collapsed (shown as one cluster node).
 */

import { getRelativePath } from '@/lib/pathUtils'
import type { Node as ApiNode, Edge as ApiEdge } from '@/types/api'

export const CLUSTER_ID_PREFIX = 'cluster:'

/** Directory part of a relative path. Root-level files return "". */
export function getFolderPath(relativePath: string): string {
  const norm = relativePath.replace(/\\/g, '/').replace(/\/+$/, '')
  const lastSlash = norm.lastIndexOf('/')
  if (lastSlash === -1) return ''
  return norm.slice(0, lastSlash)
}

/** Cluster node shown when a folder is collapsed. */
export interface ClusterNodeData {
  id: string
  kind: 'cluster'
  folderPath: string
  label: string
  nodeCount: number
}

export type EffectiveNode = ApiNode | ClusterNodeData

export function isClusterNode(n: EffectiveNode): n is ClusterNodeData {
  return (n as ClusterNodeData).kind === 'cluster'
}

/** Edge in the effective graph; source/target may be module or cluster ids. */
export interface EffectiveEdge {
  source: string
  target: string
  import_type: string
  line_numbers: number[]
  /** When merged (e.g. cluster–cluster), number of original edges. */
  count?: number
}

/**
 * Group internal (non-external) nodes by folder path. External nodes are not grouped.
 */
export function groupNodesByFolder(
  nodes: ApiNode[],
  projectPath: string
): Map<string, ApiNode[]> {
  const byFolder = new Map<string, ApiNode[]>()
  for (const node of nodes) {
    if (node.node_type === 'external') continue
    const relative = getRelativePath(node.file_path, projectPath)
    const folderPath = getFolderPath(relative)
    if (!byFolder.has(folderPath)) byFolder.set(folderPath, [])
    byFolder.get(folderPath)!.push(node)
  }
  return byFolder
}

function clusterId(folderPath: string): string {
  return `${CLUSTER_ID_PREFIX}${folderPath}`
}

/**
 * Effective nodes and edges for the graph: collapsed folders become one cluster node,
 * expanded folders show all module nodes; edges are remapped to cluster ids when
 * an endpoint lies in a collapsed folder. Multiple edges between the same cluster
 * pair are merged into one edge with count.
 */
export function getEffectiveNodesAndEdges(
  filteredNodes: ApiNode[],
  filteredEdges: ApiEdge[],
  projectPath: string,
  collapsedFolders: Set<string>
): { nodes: EffectiveNode[]; edges: EffectiveEdge[] } {
  const byFolder = groupNodesByFolder(
    filteredNodes.filter((n) => n.node_type !== 'external'),
    projectPath
  )
  const nodeToFolder = new Map<string, string>()
  for (const [folderPath, list] of byFolder) {
    for (const node of list) {
      nodeToFolder.set(node.id, folderPath)
    }
  }

  const nodes: EffectiveNode[] = []
  for (const [folderPath, list] of byFolder) {
    if (collapsedFolders.has(folderPath)) {
      const label =
        folderPath === '' ? '(root)' : folderPath.split('/').pop() ?? folderPath
      nodes.push({
        id: clusterId(folderPath),
        kind: 'cluster',
        folderPath,
        label,
        nodeCount: list.length,
      })
    } else {
      nodes.push(...list)
    }
  }
  for (const node of filteredNodes) {
    if (node.node_type === 'external') nodes.push(node)
  }

  const nodeIds = new Set(nodes.map((n) => n.id))
  const edgeCount = new Map<string, EffectiveEdge>()
  for (const e of filteredEdges) {
    let source = e.source
    let target = e.target
    const srcFolder = nodeToFolder.get(e.source)
    const tgtFolder = nodeToFolder.get(e.target)
    if (srcFolder != null && collapsedFolders.has(srcFolder)) source = clusterId(srcFolder)
    if (tgtFolder != null && collapsedFolders.has(tgtFolder)) target = clusterId(tgtFolder)
    if (!nodeIds.has(source) || !nodeIds.has(target)) continue
    const key = `${source}-${target}`
    const existing = edgeCount.get(key)
    if (existing) {
      existing.count = (existing.count ?? 1) + 1
      existing.line_numbers = [...existing.line_numbers, ...e.line_numbers]
    } else {
      edgeCount.set(key, {
        source,
        target,
        import_type: e.import_type,
        line_numbers: [...e.line_numbers],
        count: 1,
      })
    }
  }
  const edges = Array.from(edgeCount.values())
  return { nodes, edges }
}
