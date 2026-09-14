import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { getToken, logout } from '../services/auth';

vi.mock('../services/api', () => ({
  fetchIncidents: vi.fn().mockResolvedValue([]),
  fetchAnalyticsSummary: vi.fn().mockResolvedValue(null),
  updateIncidentStatus: vi.fn(),
  fetchNearestResponders: vi.fn().mockResolvedValue([]),
  dispatchResponder: vi.fn(),
}));

const session = {
  access_token: 'jwt-123',
  token_type: 'bearer',
  user: { id: 2, name: 'Control Dispatcher 1', email: 'dispatcher@sentinel.gov', role: 'dispatcher' },
};

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );

describe('Dispatcher authentication', () => {
  let fetchSpy;
  beforeEach(() => {
    logout();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });
  afterEach(() => {
    // Restore only the fetch spy - restoreAllMocks would also wipe the
    // module mocks' resolved values above.
    fetchSpy.mockRestore();
    logout();
  });

  it('redirects an anonymous visit to /dashboard to the sign-in screen', async () => {
    renderAt('/dashboard');
    expect(await screen.findByRole('heading', { name: /Dispatcher Sign-in/i })).toBeInTheDocument();
    expect(screen.queryByText(/Live Incident Feed/i)).not.toBeInTheDocument();
  });

  it('logs in against /api/v1/auth/login, stores the token and shows the operator', async () => {
    fetchSpy.mockResolvedValue({ ok: true, status: 200, json: async () => session });

    renderAt('/dashboard');
    await screen.findByRole('heading', { name: /Dispatcher Sign-in/i });

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'dispatcher@sentinel.gov' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'admin123' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));

    await waitFor(() => expect(getToken()).toBe('jwt-123'));
    expect(fetchSpy).toHaveBeenCalledWith('/api/v1/auth/login', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: 'dispatcher@sentinel.gov', password: 'admin123' }),
    }));
    expect(await screen.findByText('Control Dispatcher 1')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Dispatcher Sign-in/i })).not.toBeInTheDocument();
  });

  it('shows the server rejection instead of a generic error on bad credentials', async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });

    renderAt('/login');
    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'x@y.z' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'nope' } });
    fireEvent.click(screen.getByRole('button', { name: /Sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(getToken()).toBeNull();
  });

  it('signs out from the header and returns to the login screen', async () => {
    localStorage.setItem('sentinel.auth', JSON.stringify(session));
    renderAt('/dashboard');
    expect(await screen.findByText('Control Dispatcher 1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Sign out/i }));

    expect(await screen.findByRole('heading', { name: /Dispatcher Sign-in/i })).toBeInTheDocument();
    expect(getToken()).toBeNull();
  });
});
