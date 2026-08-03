import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ReportStatusTracker from '../components/citizen/ReportStatusTracker';
import * as api from '../services/api';

vi.mock('../services/api', () => ({
  fetchIncidents: vi.fn(),
}));

describe('ReportStatusTracker Component', () => {
  it('renders input field and search button', () => {
    render(<ReportStatusTracker />);
    expect(screen.getByPlaceholderText(/Enter Tracking ID/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Track/i })).toBeInTheDocument();
  });

  it('fetches and displays incident tracking status when valid ID submitted', async () => {
    api.fetchIncidents.mockResolvedValue([
      {
        id: 1,
        tracking_id: 'INC-A1B2C3',
        category: 'fire',
        description: 'Industrial fire',
        location_name: 'Industrial Park',
        status: 'verified',
      },
    ]);

    render(<ReportStatusTracker />);

    const input = screen.getByPlaceholderText(/Enter Tracking ID/i);
    fireEvent.change(input, { target: { value: 'INC-A1B2C3' } });
    fireEvent.click(screen.getByRole('button', { name: /Track/i }));

    await waitFor(() => {
      expect(screen.getByText('INC-A1B2C3')).toBeInTheDocument();
      expect(screen.getByText('AI Processing')).toBeInTheDocument();
      expect(screen.getByText('Verified')).toBeInTheDocument();
    });
  });
});
