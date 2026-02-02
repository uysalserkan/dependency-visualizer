"""WebSocket routes for real-time updates."""

import json
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query

from app.core.logging import get_logger
from app.websocket.manager import manager

logger = get_logger(__name__)

router = APIRouter()


@router.websocket("/ws/{client_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    client_id: str,
):
    """WebSocket endpoint for real-time updates.
    
    Args:
        websocket: WebSocket connection
        client_id: Unique client identifier
    """
    await manager.connect(websocket, client_id)
    
    try:
        # Send welcome message
        await manager.send_personal_message(
            {
                "type": "connection",
                "status": "connected",
                "client_id": client_id,
                "message": "WebSocket connection established",
            },
            websocket,
        )
        
        # Listen for messages
        while True:
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                await handle_message(websocket, client_id, message)
            except json.JSONDecodeError:
                await manager.send_personal_message(
                    {
                        "type": "error",
                        "message": "Invalid JSON format",
                    },
                    websocket,
                )
            except Exception as e:
                logger.error("Error handling message", error=str(e))
                await manager.send_personal_message(
                    {
                        "type": "error",
                        "message": str(e),
                    },
                    websocket,
                )
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, client_id)
        logger.info("Client disconnected", client_id=client_id)


async def handle_message(
    websocket: WebSocket,
    client_id: str,
    message: dict[str, Any],
):
    """Handle incoming WebSocket message.
    
    Args:
        websocket: WebSocket connection
        client_id: Client identifier
        message: Message data
    """
    message_type = message.get("type")
    
    if message_type == "subscribe":
        # Subscribe to analysis updates
        analysis_id = message.get("analysis_id")
        if analysis_id:
            await manager.subscribe_to_analysis(websocket, analysis_id)
            await manager.send_personal_message(
                {
                    "type": "subscribed",
                    "analysis_id": analysis_id,
                    "message": f"Subscribed to analysis {analysis_id}",
                },
                websocket,
            )
    
    elif message_type == "unsubscribe":
        # Unsubscribe from analysis updates
        analysis_id = message.get("analysis_id")
        if analysis_id:
            manager.unsubscribe_from_analysis(websocket, analysis_id)
            await manager.send_personal_message(
                {
                    "type": "unsubscribed",
                    "analysis_id": analysis_id,
                    "message": f"Unsubscribed from analysis {analysis_id}",
                },
                websocket,
            )
    
    elif message_type == "ping":
        # Heartbeat
        await manager.send_personal_message(
            {
                "type": "pong",
                "timestamp": message.get("timestamp"),
            },
            websocket,
        )
    
    elif message_type == "stats":
        # Get connection statistics
        stats = manager.get_stats()
        await manager.send_personal_message(
            {
                "type": "stats",
                "data": stats,
            },
            websocket,
        )
    
    else:
        await manager.send_personal_message(
            {
                "type": "error",
                "message": f"Unknown message type: {message_type}",
            },
            websocket,
        )


@router.get("/ws/stats")
async def get_websocket_stats():
    """Get WebSocket connection statistics.
    
    Returns:
        Connection statistics
    """
    return manager.get_stats()
