import { useState } from 'react';
import { Diff, GitCompare, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';

interface ComparisonProps {
  onCompare: (id1: string, id2: string) => void;
  recentAnalyses: Array<{
    id: string;
    projectPath: string;
    timestamp: string;
    nodes: number;
    edges: number;
  }>;
}

export function ComparisonSelector({ onCompare, recentAnalyses }: ComparisonProps) {
  const [analysis1, setAnalysis1] = useState('');
  const [analysis2, setAnalysis2] = useState('');

  const handleCompare = () => {
    if (analysis1 && analysis2 && analysis1 !== analysis2) {
      onCompare(analysis1, analysis2);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-2 mb-4">
        <GitCompare className="w-5 h-5 text-blue-500" />
        <h2 className="text-lg font-semibold">Compare Analyses</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Analysis 1 (Before)
          </label>
          <select
            value={analysis1}
            onChange={(e) => setAnalysis1(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select analysis...</option>
            {recentAnalyses.map((analysis) => (
              <option key={analysis.id} value={analysis.id}>
                {analysis.projectPath} - {new Date(analysis.timestamp).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Analysis 2 (After)
          </label>
          <select
            value={analysis2}
            onChange={(e) => setAnalysis2(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select analysis...</option>
            {recentAnalyses.map((analysis) => (
              <option key={analysis.id} value={analysis.id}>
                {analysis.projectPath} - {new Date(analysis.timestamp).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={handleCompare}
        disabled={!analysis1 || !analysis2 || analysis1 === analysis2}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        <div className="flex items-center justify-center gap-2">
          <Diff className="w-4 h-4" />
          Compare
        </div>
      </button>
    </div>
  );
}

interface ComparisonResultProps {
  comparison: {
    summary: {
      nodes: {
        added: number;
        removed: number;
        modified: number;
        unchanged: number;
      };
      edges: {
        added: number;
        removed: number;
        unchanged: number;
      };
      significant_changes: string[];
    };
    nodes_added: any[];
    nodes_removed: any[];
    nodes_modified: any[];
    metrics_diff: Array<{
      metric_name: string;
      value_1: number;
      value_2: number;
      change: number;
      change_percent?: number;
    }>;
  };
}

export function ComparisonResult({ comparison }: ComparisonResultProps) {
  const { summary, nodes_added, nodes_removed, nodes_modified, metrics_diff } = comparison;

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Node Changes</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-green-600 dark:text-green-400">Added</span>
              <span className="font-semibold text-green-600 dark:text-green-400">+{summary.nodes.added}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-red-600 dark:text-red-400">Removed</span>
              <span className="font-semibold text-red-600 dark:text-red-400">-{summary.nodes.removed}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-blue-600 dark:text-blue-400">Modified</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">{summary.nodes.modified}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600">
              <span className="text-sm text-gray-600 dark:text-gray-400">Unchanged</span>
              <span className="font-semibold">{summary.nodes.unchanged}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Edge Changes</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-green-600 dark:text-green-400">Added</span>
              <span className="font-semibold text-green-600 dark:text-green-400">+{summary.edges.added}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-red-600 dark:text-red-400">Removed</span>
              <span className="font-semibold text-red-600 dark:text-red-400">-{summary.edges.removed}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600">
              <span className="text-sm text-gray-600 dark:text-gray-400">Unchanged</span>
              <span className="font-semibold">{summary.edges.unchanged}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Significant Changes</h3>
          {summary.significant_changes.length > 0 ? (
            <div className="space-y-1">
              {summary.significant_changes.map((change) => (
                <div key={change} className="flex items-center gap-2">
                  <AlertCircle className="w-3 h-3 text-orange-500" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {change.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No significant changes</p>
          )}
        </div>
      </div>

      {/* Metrics Diff Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold">Metrics Comparison</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                  Metric
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                  Before
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                  After
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                  Change
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase">
                  %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {metrics_diff.map((metric) => (
                <tr key={metric.metric_name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {metric.metric_name.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                    {typeof metric.value_1 === 'number' ? metric.value_1.toFixed(2) : metric.value_1}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                    {typeof metric.value_2 === 'number' ? metric.value_2.toFixed(2) : metric.value_2}
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-medium ${getChangeColor(metric.change)}`}>
                    <div className="flex items-center justify-end gap-1">
                      {getChangeIcon(metric.change)}
                      {metric.change > 0 ? '+' : ''}{typeof metric.change === 'number' ? metric.change.toFixed(2) : metric.change}
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-sm text-right font-medium ${getChangeColor(metric.change)}`}>
                    {metric.change_percent !== null && metric.change_percent !== undefined
                      ? `${metric.change_percent > 0 ? '+' : ''}${metric.change_percent.toFixed(1)}%`
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Changed Nodes */}
      {(nodes_added.length > 0 || nodes_removed.length > 0 || nodes_modified.length > 0) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold">Node Details</h3>
          </div>
          <div className="p-4 space-y-4">
            {nodes_added.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                  Added Nodes ({nodes_added.length})
                </h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {nodes_added.slice(0, 10).map((node: any) => (
                    <div key={node.id} className="text-sm text-gray-700 dark:text-gray-300 pl-4">
                      + {node.label} ({node.type})
                    </div>
                  ))}
                  {nodes_added.length > 10 && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 pl-4">
                      ...and {nodes_added.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {nodes_removed.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
                  Removed Nodes ({nodes_removed.length})
                </h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {nodes_removed.slice(0, 10).map((node: any) => (
                    <div key={node.id} className="text-sm text-gray-700 dark:text-gray-300 pl-4">
                      - {node.label} ({node.type})
                    </div>
                  ))}
                  {nodes_removed.length > 10 && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 pl-4">
                      ...and {nodes_removed.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}

            {nodes_modified.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">
                  Modified Nodes ({nodes_modified.length})
                </h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {nodes_modified.slice(0, 10).map((nodeDiff: any) => (
                    <div key={nodeDiff.node.id} className="text-sm text-gray-700 dark:text-gray-300 pl-4">
                      ~ {nodeDiff.node.label}
                    </div>
                  ))}
                  {nodes_modified.length > 10 && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 pl-4">
                      ...and {nodes_modified.length - 10} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
