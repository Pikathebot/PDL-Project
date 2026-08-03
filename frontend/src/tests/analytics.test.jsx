import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
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

describe('Analytics View Telemetry', () => {
  it('renders analytics view metrics when navigating to /analytics', async () => {
    api.fetchAnalyticsSummary.mockResolvedValue({
      total_incidents: 14,
      active_units: 45,
      deployed_units: 32,
      available_units: 9,
      out_of_service_units: 4,
      avg_response_time_minutes: 18.4,
      category_counts: { road_accident: 10, fire: 4 },
      severity_counts: { critical: 3, major: 6, minor: 5 }
    });

    render(
      <MemoryRouter initialEntries={['/analytics']}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Analytics & SLA Telemetry Engine')).toBeInTheDocument();
    });

    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText('18.4m')).toBeInTheDocument();
  });
});
