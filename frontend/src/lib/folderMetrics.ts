import type { AnalysisResult, Node, Edge, ImportStatistics } from '@/types/api'
import { getRelativePath, isUnderFolder } from '@/lib/pathUtils'

/** Internal nodes and edges for the folder subgraph only (no externals). */
export function getFolderSubgraph(
  analysis: AnalysisResult,
  selectedFolderPath: string
): { internalNodes: Node[]; internalEdges: Edge[] } {
  const projectPath = analysis.project_path

  const internalNodes = analysis.nodes.filter((n) => {
    if (n.node_type === 'external') return false
    const relative = getRelativePath(n.file_path, projectPath)
    return isUnderFolder(relative, selectedFolderPath)
  })

  const internalIds = new Set(internalNodes.map((n) => n.id))
  const internalEdges = analysis.edges.filter(
    (e) => internalIds.has(e.source) && internalIds.has(e.target)
  )

  return { internalNodes, internalEdges }
}

/** Tarjan's algorithm: find strongly connected components. Returns array of SCCs (each SCC is array of node ids). */
function findSCCs(nodeIds: string[], edges: Edge[]): string[][] {
  const indexMap = new Map<string, number>()
  nodeIds.forEach((id, i) => indexMap.set(id, i))
  const n = nodeIds.length
  const adj: number[][] = Array.from({ length: n }, () => [])
  for (const e of edges) {
    const si = indexMap.get(e.source)
    const ti = indexMap.get(e.target)
    if (si !== undefined && ti !== undefined) adj[si].push(ti)
  }

  let index = 0
  const stack: number[] = []
  const indices: number[] = Array(n).fill(-1)
  const lowlinks: number[] = Array(n).fill(-1)
  const onStack: boolean[] = Array(n).fill(false)
  const sccs: string[][] = []

  function strongconnect(v: number) {
    indices[v] = index
    lowlinks[v] = index
    index++
    stack.push(v)
    onStack[v] = true

    for (const w of adj[v]) {
      if (indices[w] === -1) {
        strongconnect(w)
        lowlinks[v] = Math.min(lowlinks[v], lowlinks[w])
      } else if (onStack[w]) {
        lowlinks[v] = Math.min(lowlinks[v], indices[w])
      }
    }

    if (lowlinks[v] === indices[v]) {
      const scc: string[] = []
      let w: number
      do {
        w = stack.pop()!
        onStack[w] = false
        scc.push(nodeIds[w])
      } while (w !== v)
      sccs.push(scc)
    }
  }

  for (let v = 0; v < n; v++) {
    if (indices[v] === -1) strongconnect(v)
  }

  return sccs
}

export interface FolderMetrics {
  total_files: number
  total_imports: number
  internal_edges: number
  entry_points_count: number
  isolated_modules: string[]
  max_import_depth: number
  graph_density: number
  total_cycles: number
  largest_scc_size: number
  external_node_count: number
  external_edges_ratio: number
  /** Folder-scoped: count of built-in (stdlib) nodes referenced by this folder. */
  external_stdlib_count: number
  /** Folder-scoped: count of third-party package nodes referenced by this folder. */
  external_package_count: number
  statistics: ImportStatistics | null
}

/**
 * Compute folder-scoped metrics from analysis and selected folder path.
 * Uses only internal nodes/edges in the folder; externals are counted for external_*.
 */
const EMPTY_FOLDER_METRICS: FolderMetrics = {
  total_files: 0,
  total_imports: 0,
  internal_edges: 0,
  entry_points_count: 0,
  isolated_modules: [],
  max_import_depth: 0,
  graph_density: 0,
  total_cycles: 0,
  largest_scc_size: 0,
  external_node_count: 0,
  external_edges_ratio: 0,
  external_stdlib_count: 0,
  external_package_count: 0,
  statistics: null,
}

export function computeFolderMetrics(
  analysis: AnalysisResult,
  selectedFolderPath: string
): FolderMetrics {
  const { internalNodes, internalEdges } = getFolderSubgraph(analysis, selectedFolderPath)
  const n = internalNodes.length
  if (n === 0) return EMPTY_FOLDER_METRICS

  const internalIds = new Set(internalNodes.map((n) => n.id))
  const total_imports = internalEdges.length
  const internal_edges = total_imports

  // In/out degree within folder only
  const inDegree = new Map<string, number>()
  const outDegree = new Map<string, number>()
  for (const node of internalNodes) {
    inDegree.set(node.id, 0)
    outDegree.set(node.id, 0)
  }
  for (const e of internalEdges) {
    outDegree.set(e.source, (outDegree.get(e.source) ?? 0) + 1)
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1)
  }

  const entry_points_count = internalNodes.filter((node) => (inDegree.get(node.id) ?? 0) === 0).length
  const isolated_modules = internalNodes
    .filter((node) => (inDegree.get(node.id) ?? 0) === 0 && (outDegree.get(node.id) ?? 0) === 0)
    .map((node) => node.label)

  // Max import depth: BFS from entry points over internal edges only
  const adj = new Map<string, string[]>()
  for (const node of internalNodes) adj.set(node.id, [])
  for (const e of internalEdges) adj.get(e.source)!.push(e.target)

  const entryPoints = internalNodes.filter((node) => (inDegree.get(node.id) ?? 0) === 0).map((n) => n.id)
  const dist = new Map<string, number>()
  for (const id of internalIds) dist.set(id, n + 1)
  const queue: string[] = [...entryPoints]
  for (const id of entryPoints) dist.set(id, 0)
  while (queue.length > 0) {
    const u = queue.shift()!
    const d = dist.get(u)! + 1
    for (const v of adj.get(u) ?? []) {
      if (d < (dist.get(v) ?? n + 1)) {
        dist.set(v, d)
        queue.push(v)
      }
    }
  }
  let max_import_depth = 0
  for (const [, d] of dist) {
    if (d <= n && d > max_import_depth) max_import_depth = d
  }

  const possibleEdges = n <= 1 ? 0 : n * (n - 1)
  const graph_density = possibleEdges === 0 ? 0 : total_imports / possibleEdges

  // SCCs for cycles
  const sccs = findSCCs([...internalIds], internalEdges)
  const cycleSCCs = sccs.filter((scc) => scc.length > 1)
  const total_cycles = cycleSCCs.length
  const largest_scc_size =
    cycleSCCs.length === 0 ? 0 : Math.max(...cycleSCCs.map((scc) => scc.length))

  // External: nodes and edges touching folder internals; split stdlib vs package
  const externalNodeIds = new Set<string>()
  let edgesTouchingExternal = 0
  for (const e of analysis.edges) {
    const srcIn = internalIds.has(e.source)
    const tgtIn = internalIds.has(e.target)
    if (srcIn && !tgtIn) {
      externalNodeIds.add(e.target)
      edgesTouchingExternal++
    } else if (!srcIn && tgtIn) {
      externalNodeIds.add(e.source)
      edgesTouchingExternal++
    }
  }
  const external_node_count = externalNodeIds.size
  const totalEdgesTouchingFolder = internal_edges + edgesTouchingExternal
  const external_edges_ratio =
    totalEdgesTouchingFolder === 0 ? 0 : edgesTouchingExternal / totalEdgesTouchingFolder

  const nodeById = new Map(analysis.nodes.map((no) => [no.id, no]))
  let external_stdlib_count = 0
  let external_package_count = 0
  for (const id of externalNodeIds) {
    const node = nodeById.get(id)
    if (node?.node_type === 'external') {
      const kind = node.external_kind ?? 'package'
      if (kind === 'stdlib') external_stdlib_count++
      else external_package_count++
    }
  }

  // Statistics from internal graph
  const outDegrees = internalNodes.map((node) => outDegree.get(node.id) ?? 0)
  const sumOut = outDegrees.reduce((a, b) => a + b, 0)
  const avg_imports_per_file = n === 0 ? 0 : sumOut / n
  const max_imports_in_file = Math.max(...outDegrees, 0)
  const maxOutNode = internalNodes.reduce(
    (best, node) =>
      (outDegree.get(node.id) ?? 0) > (outDegree.get(best.id) ?? 0) ? node : best,
    internalNodes[0]
  )
  const max_imports_file = maxOutNode.file_path ?? ''

  let most_imported_module = ''
  let most_imported_count = 0
  for (const node of internalNodes) {
    const deg = inDegree.get(node.id) ?? 0
    if (deg > most_imported_count) {
      most_imported_count = deg
      most_imported_module = node.label
    }
  }

  const hub_modules: [string, number][] = internalNodes
    .map((node) => [node.label, (inDegree.get(node.id) ?? 0) / Math.max(n, 1)] as [string, number])
    .filter(([, score]) => score > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  const top_importers: { module: string; count: number }[] = internalNodes
    .map((node) => ({ module: node.label, count: outDegree.get(node.id) ?? 0 }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const top_imported: { module: string; count: number }[] = internalNodes
    .map((node) => ({ module: node.label, count: inDegree.get(node.id) ?? 0 }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  const statistics: ImportStatistics = {
    avg_imports_per_file,
    max_imports_in_file,
    max_imports_file: max_imports_file || (internalNodes[0]?.file_path ?? ''),
    most_imported_module: most_imported_module || (internalNodes[0]?.label ?? ''),
    most_imported_count,
    hub_modules,
    top_importers,
    top_imported,
  }

  return {
    total_files: n,
    total_imports,
    internal_edges,
    entry_points_count,
    isolated_modules,
    max_import_depth,
    graph_density,
    total_cycles,
    largest_scc_size,
    external_node_count,
    external_edges_ratio,
    external_stdlib_count,
    external_package_count,
    statistics,
  }
}
