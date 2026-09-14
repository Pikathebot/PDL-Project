// Dispatcher session: a JWT from POST /api/v1/auth/login, kept in
// localStorage so a refresh does not log the operator out mid-shift.
// Citizens never log in; the report and tracking endpoints are public.

const STORAGE_KEY = 'sentinel.auth';
const listeners = new Set();

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(session) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private mode / disabled storage: the in-memory session still works
    // until the tab closes.
  }
  listeners.forEach((fn) => fn(session));
}

export function getToken() {
  return read()?.access_token ?? null;
}

export function getUser() {
  return read()?.user ?? null;
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export async function login(email, password) {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (response.status === 401) {
    throw new Error('Invalid email or password');
  }
  if (!response.ok) {
    throw new Error('Login failed - the backend did not respond');
  }
  const session = await response.json();
  write(session);
  return session.user;
}

export function logout() {
  write(null);
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Headers for a dispatcher-only request. */
export function authHeaders(extra = {}) {
  const token = getToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

/**
 * The API answers 401 when the token is missing, expired or revoked. Clearing
 * the session sends the operator back to the login screen instead of leaving
 * an empty dashboard that looks like "no incidents".
 */
export function handleUnauthorized(response) {
  if (response.status === 401 && getToken()) {
    logout();
  }
  return response;
}
