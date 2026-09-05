import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// A minimal WebSocket stand-in. jsdom has no WebSocket, and the behaviour under
// test is entirely in the close/reconnect handling rather than the wire.
class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = FakeWebSocket.CONNECTING;
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    FakeWebSocket.instances.push(this);
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  // Simulates the server closing the connection with a given code.
  serverClose(code = 1006) {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ code });
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
    this.onclose?.({ code: 1000 });
  }
}

let wsService;

beforeEach(async () => {
  vi.useFakeTimers();
  FakeWebSocket.instances = [];
  vi.stubGlobal('WebSocket', FakeWebSocket);
  vi.resetModules();
  // Imported after the global stub so the module's WebSocket reference resolves.
  ({ wsService } = await import('../services/websocket'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const latest = () => FakeWebSocket.instances.at(-1);
const statuses = () => {
  const seen = [];
  wsService.subscribeStatus(({ status }) => seen.push(status));
  return seen;
};

describe('IncidentWebSocketService', () => {
  it('sends an auth token on the query string', () => {
    wsService.connect();
    // The original bug: no token at all, so the backend closed every connection
    // with 4001 and the dashboard silently stopped updating after mount.
    expect(latest().url).toMatch(/\/ws\/incidents\?token=/);
  });

  it('delivers parsed messages to subscribers', () => {
    const received = [];
    wsService.subscribe((msg) => received.push(msg));
    latest().open();
    latest().onmessage({ data: JSON.stringify({ type: 'new_incident', id: 3 }) });

    expect(received).toEqual([{ type: 'new_incident', id: 3 }]);
  });

  it('survives a malformed message without dropping the connection', () => {
    const received = [];
    wsService.subscribe((msg) => received.push(msg));
    latest().open();
    latest().onmessage({ data: 'not json' });

    expect(received).toEqual([]);
    expect(wsService.status).toBe('connected');
  });

  it('backs off exponentially instead of retrying every 3 seconds', () => {
    wsService.connect();
    const first = latest();

    first.serverClose(1006);
    expect(FakeWebSocket.instances).toHaveLength(1);

    // 1s, then 2s, then 4s - the old code used a flat 3s forever.
    vi.advanceTimersByTime(999);
    expect(FakeWebSocket.instances).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(2);

    latest().serverClose(1006);
    vi.advanceTimersByTime(1999);
    expect(FakeWebSocket.instances).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(FakeWebSocket.instances).toHaveLength(3);
  });

  it('does not retry a rejected token, and says why', () => {
    const seen = statuses();
    wsService.connect();
    latest().serverClose(4001);

    vi.advanceTimersByTime(60000);
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(seen).toContain('unauthorized');
    expect(wsService.statusDetail).toMatch(/VITE_WS_TOKEN/);
  });

  it('gives up after a bounded number of attempts', () => {
    wsService.connect();
    for (let i = 0; i < 20; i += 1) {
      latest().serverClose(1006);
      vi.advanceTimersByTime(60000);
    }
    // 6 retries after the initial connection, then it stops.
    expect(FakeWebSocket.instances).toHaveLength(7);
    expect(wsService.status).toBe('failed');
  });

  it('reports a full server distinctly from an unreachable one', () => {
    wsService.connect();
    for (let i = 0; i < 7; i += 1) {
      latest().serverClose(4002);
      vi.advanceTimersByTime(60000);
    }
    expect(wsService.statusDetail).toMatch(/capacity/i);
  });

  it('resets the backoff once a connection succeeds', () => {
    wsService.connect();
    latest().serverClose(1006);
    vi.advanceTimersByTime(1000);
    latest().open();
    expect(wsService.attempts).toBe(0);
  });

  it('stops reconnecting after disconnect()', () => {
    wsService.connect();
    wsService.disconnect();

    // onclose fires *after* disconnect() closes the socket. Without the
    // shouldReconnect flag the teardown path schedules another reconnect and the
    // loop cannot be stopped.
    vi.advanceTimersByTime(60000);
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(wsService.status).toBe('disconnected');
  });

  it('reports current state immediately to a new status subscriber', () => {
    wsService.connect();
    latest().open();

    const seen = [];
    wsService.subscribeStatus(({ status }) => seen.push(status));
    expect(seen).toEqual(['connected']);
  });
});
