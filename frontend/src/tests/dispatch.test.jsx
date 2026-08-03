import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import IncidentDetailPanel from '../components/dashboard/IncidentDetailPanel';
import * as api from '../services/api';

vi.mock('../services/api', () => ({
  updateIncidentStatus: vi.fn(),
  fetchNearestResponders: vi.fn(),
  dispatchResponder: vi.fn(),
}));

const mockIncident = {
  id: 101,
  tracking_id: 'INC-[TEST01]',
  category: 'road_accident',
  description: 'Vehicle collision on expressway.',
  severity: 4,
  priority_score: 92.5,
  status: 'reported',
  assigned_responder_id: null,
};

const mockResponders = [
  {
    id: 12,
    user_id: 2,
    name: 'Officer Rajesh Kumar',
    department: 'Traffic Response',
    status: 'available',
    distance_km: 0.45,
  },
];

describe('IncidentDetailPanel Dispatch Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nearest responders from spatial query and handles dispatch click', async () => {
    api.fetchNearestResponders.mockResolvedValue(mockResponders);
    api.dispatchResponder.mockResolvedValue({
      ...mockIncident,
      status: 'dispatched',
      assigned_responder_id: 12,
    });

    const handleUpdate = vi.fn();

    render(
      <IncidentDetailPanel
        incident={mockIncident}
        onClose={vi.fn()}
        onUpdate={handleUpdate}
      />
    );

    // Verify loading nearest responders
    await waitFor(() => {
      expect(screen.getByText('Officer Rajesh Kumar')).toBeInTheDocument();
    });

    expect(screen.getByText(/0.45 km away/i)).toBeInTheDocument();

    // Click Dispatch
    const dispatchButton = screen.getByText('Dispatch');
    fireEvent.click(dispatchButton);

    await waitFor(() => {
      expect(api.dispatchResponder).toHaveBeenCalledWith(101, 12);
      expect(handleUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'dispatched',
          assigned_responder_id: 12,
        })
      );
    });
  });
});
