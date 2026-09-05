// Close codes the backend uses to reject a handshake (see
// backend/app/core/websocket_manager.py). Neither is worth retrying blindly:
// a bad token stays bad, and a full server needs a longer wait.
const CLOSE_UNAUTHORIZED = 4001;
const CLOSE_MAX_CONNECTIONS = 4002;

const MAX_RECONNECT_ATTEMPTS = 6;
const BASE_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;

class IncidentWebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = new Set();
    this.statusListeners = new Set();
    this.reconnectTimer = null;
    this.attempts = 0;
    this.status = 'disconnected';
    this.statusDetail = null;
    // onclose fires *after* disconnect() closes the socket, so without this flag
    // the teardown path immediately schedules another reconnect and the loop
    // cannot be stopped.
    this.shouldReconnect = true;
  }

  getWebSocketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:5173';
    const token = import.meta.env.VITE_WS_TOKEN ?? '';
    return `${protocol}//${host}/ws/incidents?token=${encodeURIComponent(token)}`;
  }

  _setStatus(status, detail = null) {
    this.status = status;
    this.statusDetail = detail;
    this.statusListeners.forEach((cb) => cb({ status, detail }));
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.shouldReconnect = true;
    this._setStatus('connecting');

    try {
      this.ws = new WebSocket(this.getWebSocketUrl());

      this.ws.onopen = () => {
        this.attempts = 0;
        this._setStatus('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.listeners.forEach((callback) => callback(message));
        } catch (err) {
          console.error('Failed to parse WS message:', err);
        }
      };

      this.ws.onclose = (event) => {
        this.ws = null;

        if (!this.shouldReconnect) {
          this._setStatus('disconnected');
          return;
        }

        // A rejected token will be rejected identically every time - reconnecting
        // just spins. Surface it instead so the misconfiguration is visible.
        if (event.code === CLOSE_UNAUTHORIZED) {
          this._setStatus(
            'unauthorized',
            'WebSocket rejected the auth token. Check VITE_WS_TOKEN matches the backend WS_ACCESS_TOKEN.'
          );
          return;
        }

        if (this.attempts >= MAX_RECONNECT_ATTEMPTS) {
          this._setStatus(
            'failed',
            event.code === CLOSE_MAX_CONNECTIONS
              ? 'Server refused the connection (at capacity). Reload to try again.'
              : 'Could not reach the live feed. Reload to try again.'
          );
          return;
        }

        // Exponential backoff, capped, so a dead backend does not get hammered.
        const delay = Math.min(BASE_RECONNECT_DELAY_MS * 2 ** this.attempts, MAX_RECONNECT_DELAY_MS);
        this.attempts += 1;
        this._setStatus('reconnecting', `Retrying in ${Math.round(delay / 1000)}s`);
        this.reconnectTimer = setTimeout(() => this.connect(), delay);
      };

      this.ws.onerror = () => {
        // onclose always follows, and carries the code we actually branch on.
        console.warn('WebSocket error; awaiting close event');
      };
    } catch (e) {
      console.error('WebSocket connection failed:', e);
      this._setStatus('failed', 'Could not open a WebSocket connection.');
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      this.connect();
    }
    return () => this.listeners.delete(callback);
  }

  /** Subscribe to connection-state changes. Fires immediately with current state. */
  subscribeStatus(callback) {
    this.statusListeners.add(callback);
    callback({ status: this.status, detail: this.statusDetail });
    return () => this.statusListeners.delete(callback);
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) this.ws.close();
  }
}

export const wsService = new IncidentWebSocketService();
