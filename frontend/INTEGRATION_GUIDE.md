# Frontend Integration Guide - Phase 9 Features

This guide shows how to integrate the new Phase 9 backend features (WebSocket, GraphQL, Comparison, Code Preview) into your React frontend.

## Table of Contents

1. [Installation](#installation)
2. [GraphQL Client Setup](#graphql-client-setup)
3. [WebSocket Integration](#websocket-integration)
4. [Comparison View](#comparison-view)
5. [Code Preview](#code-preview)
6. [Complete Integration Example](#complete-integration-example)

---

## Installation

First, install the new dependencies:

```bash
cd frontend
npm install urql graphql
```

or with pnpm:

```bash
pnpm add urql graphql
```

---

## GraphQL Client Setup

### 1. Import and Configure

The GraphQL client is already configured in `src/lib/graphql.ts`. To use it in your components:

```typescript
import { useQuery } from 'urql';
import { GET_ANALYSIS, graphqlClient } from '@/lib/graphql';

function MyComponent() {
  const [result] = useQuery({
    query: GET_ANALYSIS,
    variables: { id: 'analysis-123' },
  });

  const { data, fetching, error } = result;

  if (fetching) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{/* Use data.analysis */}</div>;
}
```

### 2. Wrap Your App with Provider

Update `src/main.tsx` or `src/App.tsx`:

```typescript
import { Provider as UrqlProvider } from 'urql';
import { graphqlClient } from './lib/graphql';

function App() {
  return (
    <UrqlProvider value={graphqlClient}>
      {/* Your app components */}
    </UrqlProvider>
  );
}
```

### 3. Available Queries

```typescript
// Get analysis by ID
const [result] = useQuery({
  query: GET_ANALYSIS,
  variables: { id: 'abc-123' },
});

// Search nodes
const [result] = useQuery({
  query: SEARCH_NODES,
  variables: { analysisId: 'abc-123', query: 'utils', limit: 10 },
});

// Get recent analyses
const [result] = useQuery({
  query: GET_RECENT_ANALYSES,
  variables: { limit: 10 },
});

// Get top nodes by PageRank
const [result] = useQuery({
  query: GET_TOP_NODES,
  variables: { id: 'abc-123', limit: 10 },
});

// Filter nodes by language
const [result] = useQuery({
  query: GET_NODES_BY_LANGUAGE,
  variables: { id: 'abc-123', language: 'python' },
});
```

---

## WebSocket Integration

### 1. Basic Usage

```typescript
import { useWebSocket } from '@/hooks/useWebSocket';

function AnalysisMonitor({ analysisId }: { analysisId: string }) {
  const {
    isConnected,
    lastMessage,
    subscribe,
    unsubscribe,
  } = useWebSocket({
    clientId: 'user-123', // Use unique user ID
    onMessage: (message) => {
      console.log('Received:', message);
      
      if (message.type === 'analysis_update') {
        // Update UI with analysis progress
        console.log('Progress:', message.data.progress);
      }
    },
    onConnect: () => {
      console.log('WebSocket connected!');
    },
    onDisconnect: () => {
      console.log('WebSocket disconnected');
    },
  });

  // Subscribe to analysis updates
  useEffect(() => {
    if (isConnected && analysisId) {
      subscribe(analysisId);
    }
    
    return () => {
      if (analysisId) {
        unsubscribe(analysisId);
      }
    };
  }, [isConnected, analysisId, subscribe, unsubscribe]);

  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      {lastMessage && (
        <div>Last message: {JSON.stringify(lastMessage)}</div>
      )}
    </div>
  );
}
```

### 2. Real-Time Progress Updates

```typescript
function AnalysisProgress({ analysisId }: { analysisId: string }) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  useWebSocket({
    clientId: `analysis-${analysisId}`,
    onMessage: (message) => {
      if (
        message.type === 'analysis_update' &&
        message.analysis_id === analysisId
      ) {
        setProgress(message.data.progress || 0);
        setStatus(message.data.status || '');
      }
    },
  });

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>{status}</span>
        <span>{progress}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
```

### 3. Broadcasting to All Users

```typescript
function GlobalNotifications() {
  const [notifications, setNotifications] = useState<string[]>([]);

  useWebSocket({
    clientId: 'global-notifications',
    onMessage: (message) => {
      if (message.type === 'broadcast') {
        setNotifications(prev => [...prev, message.message]);
      }
    },
  });

  return (
    <div>
      {notifications.map((notif, idx) => (
        <div key={idx} className="p-2 bg-blue-100 rounded mb-2">
          {notif}
        </div>
      ))}
    </div>
  );
}
```

---

## Comparison View

### 1. Basic Usage

```typescript
import { useState } from 'react';
import { ComparisonSelector, ComparisonResult } from '@/components/Comparison';

function ComparisonPage() {
  const [comparison, setComparison] = useState(null);
  const [recentAnalyses, setRecentAnalyses] = useState([]);

  // Fetch recent analyses
  useEffect(() => {
    fetch('http://localhost:8000/api/compare/recent')
      .then(res => res.json())
      .then(data => setRecentAnalyses(data.analyses));
  }, []);

  const handleCompare = async (id1: string, id2: string) => {
    const response = await fetch('http://localhost:8000/api/compare/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        analysis_id_1: id1,
        analysis_id_2: id2,
      }),
    });

    const data = await response.json();
    setComparison(data);
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Compare Analyses</h1>
      
      <ComparisonSelector
        onCompare={handleCompare}
        recentAnalyses={recentAnalyses}
      />

      {comparison && <ComparisonResult comparison={comparison} />}
    </div>
  );
}
```

### 2. Integration with Existing Analysis View

```typescript
function AnalysisView({ analysisId }: { analysisId: string }) {
  const [showComparison, setShowComparison] = useState(false);
  const [compareWith, setCompareWith] = useState<string | null>(null);

  return (
    <div>
      {/* Existing analysis view */}
      <div>...</div>

      {/* Comparison button */}
      <button
        onClick={() => setShowComparison(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Compare with Previous
      </button>

      {/* Comparison modal */}
      {showComparison && (
        <ComparisonModal
          currentAnalysisId={analysisId}
          onClose={() => setShowComparison(false)}
        />
      )}
    </div>
  );
}
```

---

## Code Preview

### 1. Basic Usage

```typescript
import { useState } from 'react';
import { CodePreview } from '@/components/CodePreview';

function AnalysisWithPreview() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleNodeClick = (node: any) => {
    if (node.file_path) {
      setSelectedFile(node.file_path);
      setShowPreview(true);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Main content */}
      <div className="flex-1">
        {/* Graph or list view */}
        <button onClick={() => handleNodeClick({ file_path: '/path/to/file.py' })}>
          Click to preview
        </button>
      </div>

      {/* Code preview sidebar */}
      {showPreview && (
        <div className="w-96">
          <CodePreview
            filePath={selectedFile}
            onClose={() => setShowPreview(false)}
          />
        </div>
      )}
    </div>
  );
}
```

### 2. With Graph Integration

```typescript
function GraphView({ analysis }: { analysis: any }) {
  const [selectedNode, setSelectedNode] = useState(null);

  // Cytoscape event handler
  const handleNodeTap = (evt: any) => {
    const node = evt.target.data();
    setSelectedNode(node);
  };

  return (
    <div className="flex h-full">
      <div className="flex-1">
        <CytoscapeGraph
          elements={analysis.elements}
          onNodeTap={handleNodeTap}
        />
      </div>

      {selectedNode?.filePath && (
        <div className="w-1/3 min-w-[400px]">
          <CodePreview
            filePath={selectedNode.filePath}
            onClose={() => setSelectedNode(null)}
          />
        </div>
      )}
    </div>
  );
}
```

---

## Complete Integration Example

Here's a complete example integrating all Phase 9 features:

```typescript
import { useState, useEffect } from 'react';
import { Provider as UrqlProvider, useQuery } from 'urql';
import { graphqlClient, GET_RECENT_ANALYSES } from '@/lib/graphql';
import { useWebSocket } from '@/hooks/useWebSocket';
import { ComparisonSelector, ComparisonResult } from '@/components/Comparison';
import { CodePreview } from '@/components/CodePreview';

// Main App Component
function App() {
  return (
    <UrqlProvider value={graphqlClient}>
      <Dashboard />
    </UrqlProvider>
  );
}

// Dashboard with all features
function Dashboard() {
  const [activeTab, setActiveTab] = useState<'analysis' | 'comparison'>('analysis');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [comparison, setComparison] = useState(null);

  // GraphQL: Fetch recent analyses
  const [result] = useQuery({
    query: GET_RECENT_ANALYSES,
    variables: { limit: 10 },
  });

  // WebSocket: Real-time notifications
  const { isConnected, lastMessage } = useWebSocket({
    clientId: 'dashboard-user',
    onMessage: (message) => {
      if (message.type === 'analysis_complete') {
        alert('Analysis complete!');
      }
    },
  });

  const recentAnalyses = result.data?.recentAnalyses || [];

  const handleCompare = async (id1: string, id2: string) => {
    const response = await fetch('http://localhost:8000/api/compare/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ analysis_id_1: id1, analysis_id_2: id2 }),
    });
    const data = await response.json();
    setComparison(data);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Import Visualizer</h1>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex gap-4 px-4">
          <button
            onClick={() => setActiveTab('analysis')}
            className={`py-3 px-4 border-b-2 transition-colors ${
              activeTab === 'analysis'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Analysis
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={`py-3 px-4 border-b-2 transition-colors ${
              activeTab === 'comparison'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Comparison
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'analysis' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Recent Analyses</h2>
              {result.fetching && <div>Loading...</div>}
              {result.error && <div>Error: {result.error.message}</div>}
              <div className="grid gap-4">
                {recentAnalyses.map((analysis: any) => (
                  <div
                    key={analysis.id}
                    className="p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 cursor-pointer"
                    onClick={() => {
                      // Navigate to analysis detail
                    }}
                  >
                    <h3 className="font-medium">{analysis.projectPath}</h3>
                    <p className="text-sm text-gray-600">
                      {analysis.metrics.totalNodes} nodes, {analysis.metrics.totalEdges} edges
                    </p>
                    <p className="text-xs text-gray-500">{new Date(analysis.timestamp).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'comparison' && (
            <div className="space-y-6">
              <ComparisonSelector
                onCompare={handleCompare}
                recentAnalyses={recentAnalyses.map((a: any) => ({
                  id: a.id,
                  projectPath: a.projectPath,
                  timestamp: a.timestamp,
                  nodes: a.metrics.totalNodes,
                  edges: a.metrics.totalEdges,
                }))}
              />
              {comparison && <ComparisonResult comparison={comparison} />}
            </div>
          )}
        </div>

        {/* Code Preview Sidebar */}
        {selectedFile && (
          <div className="w-1/3 min-w-[400px]">
            <CodePreview
              filePath={selectedFile}
              onClose={() => setSelectedFile(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
```

---

## Testing

### 1. Test WebSocket Connection

```typescript
// In browser console
const ws = new WebSocket('ws://localhost:8000/api/ws/test-client');
ws.onmessage = (event) => console.log('Received:', JSON.parse(event.data));
ws.onopen = () => ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
```

### 2. Test GraphQL Query

```typescript
// In browser console or component
fetch('http://localhost:8000/api/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: '{ recentAnalyses(limit: 5) { id projectPath } }'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

### 3. Test Comparison API

```bash
curl -X POST http://localhost:8000/api/compare/ \
  -H "Content-Type: application/json" \
  -d '{
    "analysis_id_1": "abc-123",
    "analysis_id_2": "def-456"
  }'
```

---

## Performance Tips

1. **GraphQL Caching**: URQL automatically caches queries. Use `requestPolicy: 'cache-and-network'` for real-time data.

2. **WebSocket Reconnection**: The `useWebSocket` hook automatically reconnects on disconnect.

3. **Code Preview**: Consider virtualizing large files to improve performance.

4. **Comparison**: Limit displayed nodes/edges to first 100 for better UI performance.

---

## Troubleshooting

### WebSocket Connection Failed

- Ensure backend is running on port 8000
- Check CORS settings in backend
- Verify `VITE_API_URL` environment variable

### GraphQL Errors

- Check network tab for request/response
- Verify backend GraphQL endpoint is accessible at `/api/graphql`
- Check query syntax in GraphQL Playground

### Code Preview Not Loading

- Verify file path is absolute
- Check backend logs for permission errors
- Ensure file encoding is supported (UTF-8, Latin-1)

---

## Next Steps

1. Add authentication to WebSocket connections
2. Implement GraphQL subscriptions for real-time updates
3. Add syntax highlighting to code preview
4. Create saved comparison templates
5. Add export functionality for comparison reports

---

**Congratulations!** You've successfully integrated all Phase 9 features into your React frontend! 🎉
