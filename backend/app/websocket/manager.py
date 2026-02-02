"""WebSocket connection manager for real-time updates."""

import json
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect

from app.core.logging import get_logger

logger = get_logger(__name__)


class ConnectionManager:
    """Manage WebSocket connections."""
    
    def __init__(self):
        """Initialize connection manager."""
        self.active_connections: dict[str, list[WebSocket]] = {}
        self.analysis_subscribers: dict[str, list[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        """Accept a new WebSocket connection.
        
        Args:
            websocket: WebSocket connection
            client_id: Unique client identifier
        """
        await websocket.accept()
        
        if client_id not in self.active_connections:
            self.active_connections[client_id] = []
        
        self.active_connections[client_id].append(websocket)
        
        logger.info(
            "WebSocket connection established",
            client_id=client_id,
            total_connections=sum(len(conns) for conns in self.active_connections.values()),
        )
    
    def disconnect(self, websocket: WebSocket, client_id: str):
        """Remove a WebSocket connection.
        
        Args:
            websocket: WebSocket connection
            client_id: Client identifier
        """
        if client_id in self.active_connections:
            if websocket in self.active_connections[client_id]:
                self.active_connections[client_id].remove(websocket)
            
            # Clean up empty lists
            if not self.active_connections[client_id]:
                del self.active_connections[client_id]
        
        # Remove from analysis subscribers
        for analysis_id, subscribers in list(self.analysis_subscribers.items()):
            if websocket in subscribers:
                subscribers.remove(websocket)
            if not subscribers:
                del self.analysis_subscribers[analysis_id]
        
        logger.info(
            "WebSocket connection closed",
            client_id=client_id,
            total_connections=sum(len(conns) for conns in self.active_connections.values()),
        )
    
    async def subscribe_to_analysis(
        self,
        websocket: WebSocket,
        analysis_id: str,
    ):
        """Subscribe a connection to analysis updates.
        
        Args:
            websocket: WebSocket connection
            analysis_id: Analysis ID to subscribe to
        """
        if analysis_id not in self.analysis_subscribers:
            self.analysis_subscribers[analysis_id] = []
        
        if websocket not in self.analysis_subscribers[analysis_id]:
            self.analysis_subscribers[analysis_id].append(websocket)
        
        logger.debug(
            "Subscribed to analysis updates",
            analysis_id=analysis_id,
            subscribers=len(self.analysis_subscribers[analysis_id]),
        )
    
    def unsubscribe_from_analysis(
        self,
        websocket: WebSocket,
        analysis_id: str,
    ):
        """Unsubscribe from analysis updates.
        
        Args:
            websocket: WebSocket connection
            analysis_id: Analysis ID
        """
        if analysis_id in self.analysis_subscribers:
            if websocket in self.analysis_subscribers[analysis_id]:
                self.analysis_subscribers[analysis_id].remove(websocket)
            
            if not self.analysis_subscribers[analysis_id]:
                del self.analysis_subscribers[analysis_id]
    
    async def send_personal_message(
        self,
        message: dict[str, Any],
        websocket: WebSocket,
    ):
        """Send a message to a specific connection.
        
        Args:
            message: Message to send
            websocket: WebSocket connection
        """
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error("Failed to send message", error=str(e))
    
    async def broadcast_to_client(
        self,
        message: dict[str, Any],
        client_id: str,
    ):
        """Broadcast message to all connections of a client.
        
        Args:
            message: Message to broadcast
            client_id: Client identifier
        """
        if client_id not in self.active_connections:
            return
        
        disconnected = []
        
        for connection in self.active_connections[client_id]:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error("Failed to broadcast message", error=str(e))
                disconnected.append(connection)
        
        # Clean up disconnected connections
        for connection in disconnected:
            self.disconnect(connection, client_id)
    
    async def broadcast_analysis_update(
        self,
        analysis_id: str,
        update: dict[str, Any],
    ):
        """Broadcast update to all subscribers of an analysis.
        
        Args:
            analysis_id: Analysis ID
            update: Update data
        """
        if analysis_id not in self.analysis_subscribers:
            return
        
        message = {
            "type": "analysis_update",
            "analysis_id": analysis_id,
            "data": update,
        }
        
        disconnected = []
        
        for websocket in self.analysis_subscribers[analysis_id]:
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(
                    "Failed to send analysis update",
                    analysis_id=analysis_id,
                    error=str(e),
                )
                disconnected.append(websocket)
        
        # Clean up disconnected connections
        for websocket in disconnected:
            self.unsubscribe_from_analysis(websocket, analysis_id)
    
    async def broadcast_to_all(self, message: dict[str, Any]):
        """Broadcast message to all active connections.
        
        Args:
            message: Message to broadcast
        """
        disconnected = []
        
        for client_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error("Failed to broadcast to all", error=str(e))
                    disconnected.append((connection, client_id))
        
        # Clean up disconnected connections
        for connection, client_id in disconnected:
            self.disconnect(connection, client_id)
    
    def get_stats(self) -> dict[str, Any]:
        """Get connection statistics.
        
        Returns:
            Connection statistics
        """
        return {
            "total_clients": len(self.active_connections),
            "total_connections": sum(
                len(conns) for conns in self.active_connections.values()
            ),
            "active_analyses": len(self.analysis_subscribers),
            "analysis_subscribers": {
                analysis_id: len(subscribers)
                for analysis_id, subscribers in self.analysis_subscribers.items()
            },
        }


# Global connection manager
manager = ConnectionManager()
