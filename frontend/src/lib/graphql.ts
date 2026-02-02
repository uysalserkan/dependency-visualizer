import { createClient, cacheExchange, fetchExchange } from 'urql';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const graphqlClient = createClient({
  url: `${API_URL}/api/graphql`,
  exchanges: [cacheExchange, fetchExchange],
  fetchOptions: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
});

// GraphQL queries
export const GET_ANALYSIS = `
  query GetAnalysis($id: String!) {
    analysis(id: $id) {
      id
      projectPath
      timestamp
      nodes {
        id
        label
        type
        modulePath
        filePath
        language
        externalKind
        importsCount
        importedByCount
        pagerank
        betweenness
      }
      edges {
        id
        source
        target
        importType
        lineNumber
      }
      metrics {
        totalNodes
        totalEdges
        totalFiles
        languages
        importTypes
        avgDegree
        maxDegree
        density
        isConnected
        numComponents
        avgClustering
        circularDependencies
      }
      warnings
    }
  }
`;

export const SEARCH_NODES = `
  query SearchNodes($analysisId: String!, $query: String!, $limit: Int) {
    searchNodes(analysisId: $analysisId, query: $query, limit: $limit) {
      id
      label
      type
      modulePath
      filePath
      language
      importsCount
      importedByCount
      pagerank
    }
  }
`;

export const GET_RECENT_ANALYSES = `
  query GetRecentAnalyses($limit: Int) {
    recentAnalyses(limit: $limit) {
      id
      projectPath
      timestamp
      metrics {
        totalNodes
        totalEdges
      }
    }
  }
`;

export const GET_TOP_NODES = `
  query GetTopNodes($id: String!, $limit: Int) {
    analysis(id: $id) {
      topNodes(limit: $limit) {
        id
        label
        pagerank
        importsCount
        importedByCount
      }
    }
  }
`;

export const GET_NODES_BY_LANGUAGE = `
  query GetNodesByLanguage($id: String!, $language: String!) {
    analysis(id: $id) {
      nodesByLanguage(language: $language) {
        id
        label
        type
        modulePath
      }
    }
  }
`;

export const GET_EDGES_FOR_NODE = `
  query GetEdgesForNode($id: String!, $nodeId: String!) {
    analysis(id: $id) {
      node(id: $nodeId) {
        id
        label
      }
      edgesForNode(nodeId: $nodeId) {
        id
        source
        target
        importType
      }
    }
  }
`;
