class IncidentWebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Set();
    this.reconnectTimer = null;
  }

  getWebSocketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:5173';
    return `${protocol}//${host}/ws/incidents`;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.getWebSocketUrl());

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.listeners.forEach((callback) => callback(message));
        } catch (err) {
          console.error("Failed to parse WS message:", err);
        }
      };

      this.ws.onclose = () => {
        this.reconnectTimer = setTimeout(() => this.connect(), 3000);
      };

      this.ws.onerror = (err) => {
        console.warn("WebSocket error:", err);
      };
    } catch (e) {
      console.error("WebSocket connection failed:", e);
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      this.connect();
    }
    return () => this.listeners.delete(callback);
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) this.ws.close();
  }
}

export const wsService = new IncidentWebSocketService();
