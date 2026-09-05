import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as api from '../services/api';
import App from '../App';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../services/api', () => ({
  fetchIncidents: vi.fn().mockResolvedValue([]),
  fetchAnalyticsSummary: vi.fn(),
  updateIncidentStatus: vi.fn(),
  fetchNearestResponders: vi.fn().mockResolvedValue([]),
  dispatchResponder: vi.fn(),
}));

const summary = {
  total_incidents: 14,
  open_incidents: 11,
  category_counts: { road_accident: 10, fire: 4 },
  severity_counts: { critical: 3, major: 6, minor: 5 },
  status_counts: { reported: 8, verified: 3, resolved: 3 },
  responder_counts: { available: 7, busy: 5, offline: 2 },
  total_responders: 14,
  clusters: { count: 2, merged_reports: 5 },
};

const renderAnalytics = () =>
  render(
    <MemoryRouter initialEntries={['/analytics']}>
      <App />
    </MemoryRouter>
  );

describe('Analytics View Telemetry', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders metrics computed from the API payload', async () => {
    api.fetchAnalyticsSummary.mockResolvedValue(summary);
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('Analytics & SLA Telemetry Engine')).toBeInTheDocument();
    });

    // Values chosen so no hardcoded fallback could produce them.
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('/ 14')).toBeInTheDocument();
    expect(screen.getByText('/ 5 merged')).toBeInTheDocument();
  });

  it('never renders the previously fabricated constants', async () => {
    api.fetchAnalyticsSummary.mockResolvedValue(summary);
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText('Analytics & SLA Telemetry Engine')).toBeInTheDocument();
    });

    // These were shown regardless of the data before the fix.
    expect(screen.queryByText('18.4m')).not.toBeInTheDocument();
    expect(screen.queryByText('45')).not.toBeInTheDocument();
    expect(screen.queryByText('32')).not.toBeInTheDocument();
  });

  it('shows an error state instead of numbers when the API fails', async () => {
    api.fetchAnalyticsSummary.mockRejectedValue(new Error('backend down'));
    renderAnalytics();

    await waitFor(() => {
      expect(screen.getByText(/Analytics unavailable/i)).toBeInTheDocument();
    });

    // The critical regression: a failed fetch must not render plausible numbers.
    expect(screen.queryByText('18.4m')).not.toBeInTheDocument();
    expect(screen.queryByText('45')).not.toBeInTheDocument();
  });
});
