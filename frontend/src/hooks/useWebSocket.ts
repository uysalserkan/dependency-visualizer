import { useEffect, useRef, useState, useCallback } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL = API_URL.replace('http', 'ws');

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface UseWebSocketOptions {
  clientId: string;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export function useWebSocket({
  clientId,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
  autoReconnect = true,
  reconnectInterval = 3000,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subscribedAnalyses = useRef<Set<string>>(new Set());

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const ws = new WebSocket(`${WS_URL}/api/ws/${clientId}`);

    ws.onopen = () => {
      console.log('[WebSocket] Connected');
      setIsConnected(true);
      onConnect?.();
      
      // Resubscribe to analyses
      subscribedAnalyses.current.forEach(analysisId => {
        send({ type: 'subscribe', analysis_id: analysisId });
      });
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;
        console.log('[WebSocket] Message:', message);
        setLastMessage(message);
        onMessage?.(message);
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
      onError?.(error);
    };

    ws.onclose = () => {
      console.log('[WebSocket] Disconnected');
      setIsConnected(false);
      onDisconnect?.();

      // Auto-reconnect
      if (autoReconnect) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[WebSocket] Attempting to reconnect...');
          connect();
        }, reconnectInterval);
      }
    };

    wsRef.current = ws;
  }, [clientId, onConnect, onDisconnect, onError, onMessage, autoReconnect, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const send = useCallback((message: WebSocketMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Not connected, cannot send message');
    }
  }, []);

  const subscribe = useCallback((analysisId: string) => {
    subscribedAnalyses.current.add(analysisId);
    send({ type: 'subscribe', analysis_id: analysisId });
  }, [send]);

  const unsubscribe = useCallback((analysisId: string) => {
    subscribedAnalyses.current.delete(analysisId);
    send({ type: 'unsubscribe', analysis_id: analysisId });
  }, [send]);

  const ping = useCallback(() => {
    send({ type: 'ping', timestamp: Date.now() });
  }, [send]);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Heartbeat
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      ping();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [isConnected, ping]);

  return {
    isConnected,
    lastMessage,
    send,
    subscribe,
    unsubscribe,
    disconnect,
    reconnect: connect,
  };
}
