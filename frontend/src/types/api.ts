export interface ImportInfo {
  source_file: string
  imported_module: string
  import_type: 'module' | 'from'
  line_number: number
}

export interface Node {
  id: string
  label: string
  file_path: string
  node_type: 'module' | 'package' | 'external'
  /** For external nodes: 'stdlib' (built-in) or 'package' (third-party). Undefined for internal or legacy. */
  external_kind?: 'stdlib' | 'package'
  /** For external package nodes: installed version if resolvable (e.g. PyPI, npm). */
  version?: string | null
  import_count: number
  imported_by_count: number
  pagerank: number
  betweenness: number
  /** Phase 1: number of cycles this node participates in (optional for backward compat) */
  cycle_count?: number
  /** Phase 1: Ce = out/(in+out); 0=stable, 1=unstable */
  instability?: number
  /** Phase 1: shortest distance from nearest entry point */
  depth?: number
  /** Phase 2: closeness centrality (0-1) */
  closeness?: number
  /** Phase 2: eigenvector centrality */
  eigenvector?: number
  /** Phase 2: share of this node's imports that are external (0-1) */
  external_ratio?: number
  /** File size in bytes (internal nodes only; undefined for external) */
  size_bytes?: number | null
  /** Line count (internal nodes only; undefined if file too large or unavailable) */
  line_count?: number | null
  /** Latest commit hash for this file (internal nodes only; set at analysis time) */
  commit_hash?: string | null
}

export interface Edge {
  source: string
  target: string
  import_type: string
  line_numbers: number[]
}

export interface CycleDetail {
  nodes: string[]
  length: number
  severity: 'high' | 'medium' | 'low'
  edges: any[]
}

export interface ModuleCount {
  module: string
  count: number
}

export interface ImportStatistics {
  avg_imports_per_file: number
  max_imports_in_file: number
  max_imports_file: string
  most_imported_module: string
  most_imported_count: number
  hub_modules: [string, number][]
  top_importers?: ModuleCount[]
  top_imported?: ModuleCount[]
}

export interface GraphMetrics {
  total_files: number
  total_imports: number
  circular_dependencies: string[][]
  max_import_depth: number
  isolated_modules: string[]
  cycle_details: CycleDetail[]
  statistics: ImportStatistics | null
  /** Phase 1: edges / possible edges (0-1) (optional for backward compat) */
  graph_density?: number
  /** Phase 1: total number of circular dependencies */
  total_cycles?: number
  /** Phase 2: share of all edges pointing to external nodes (0-1) */
  external_edges_ratio?: number
  /** Enriched: internal modules with no incoming imports */
  entry_points_count?: number
  /** Enriched: distinct external packages referenced */
  external_node_count?: number
  /** Enriched: edges between internal modules only */
  internal_edges?: number
  /** Enriched: average cycle length */
  avg_cycle_length?: number
  /** Enriched: longest cycle length */
  max_cycle_length?: number
  /** Enriched: size of largest strongly connected component */
  largest_scc_size?: number
}

export interface FilePreview {
  file_path: string
  content: string
  line_count: number
  size_bytes: number
  imports: ImportInfo[]
}

export interface FileBlameResponse {
  commit_hash: string
  subject: string
  author_name: string
  author_email: string
  date: string
}

export interface Insight {
  type: 'warning' | 'info' | 'success'
  title: string
  description: string
  severity: 'high' | 'medium' | 'low'
}

export interface Recommendation {
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
}

export interface InsightsResponse {
  health_score: number
  health_status: 'excellent' | 'good' | 'fair' | 'poor'
  insights: Insight[]
  recommendations: Recommendation[]
  summary: {
    total_files: number
    circular_dependencies: number
    isolated_modules: number
    max_depth: number
  }
}

export interface AnalysisResult {
  id: string
  project_path: string
  nodes: Node[]
  edges: Edge[]
  metrics: GraphMetrics
  warnings: string[]
}

export interface AnalyzeRequest {
  project_path: string
  include_external?: boolean
  ignore_patterns?: string[]
}

export interface AnalyzeRepositoryRequest {
  repository_url: string
  branch?: string | null
  ignore_patterns?: string[]
}

export interface AffectedFile {
  file_path: string
  distance: number
  impact_type: 'direct' | 'transitive'
  pagerank: number
  imported_by_count: number
}

export interface ImpactReport {
  target_file: string
  affected_count: number
  forward_impact: AffectedFile[]
  backward_impact: AffectedFile[]
  impact_score: number
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  dependency_chains: string[][]
}
