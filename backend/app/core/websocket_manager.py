import logging
import secrets
import time
from typing import List, Dict, Any
from fastapi import WebSocket, WebSocketDisconnect, Query

from backend.app.core.config import settings

logger = logging.getLogger(__name__)

class ConnectionManager:
    """
    Manages active WebSocket connections and broadcasts real-time incident updates to clients.
    Includes basic token auth and connection limits.
    """
    def __init__(self, max_connections: int = 100):
        self.active_connections: List[WebSocket] = []
        self.max_connections = max_connections
        self.connection_times: Dict[WebSocket, float] = {}

    async def connect(self, websocket: WebSocket, token: str = Query(None)):
        # Basic token validation (in production, use proper JWT validation)
        if not self._validate_token(token):
            await websocket.close(code=4001, reason="Invalid or missing auth token")
            return False
            
        if len(self.active_connections) >= self.max_connections:
            await websocket.close(code=4002, reason="Max connections reached")
            return False
            
        await websocket.accept()
        self.active_connections.append(websocket)
        self.connection_times[websocket] = time.time()
        logger.info(f"WebSocket client connected. Total active connections: {len(self.active_connections)}")
        return True

    def _validate_token(self, token: str) -> bool:
        """
        Validate the WebSocket auth token against the configured shared token.

        This is deliberately a single static token rather than real authentication:
        it gives the dispatcher feed a working handshake for the demo. Replace with
        JWT signature and expiry validation before any non-demo deployment.
        """
        if not token:
            return False
        return secrets.compare_digest(token, settings.WS_ACCESS_TOKEN)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            self.connection_times.pop(websocket, None)
            logger.info(f"WebSocket client disconnected. Remaining connections: {len(self.active_connections)}")

    async def broadcast(self, event_type: str, data: Dict[str, Any]):
        message = {
            "event": event_type,
            "data": data
        }
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Error broadcasting WebSocket message: {e}")
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)

    def get_connection_count(self) -> int:
        return len(self.active_connections)

ws_manager = ConnectionManager()
