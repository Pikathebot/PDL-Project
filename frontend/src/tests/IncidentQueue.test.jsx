import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import IncidentQueue from '../components/dashboard/IncidentQueue';

const mockIncidents = [
  {
    id: 1,
    tracking_id: 'INC-A1B2C3',
    category: 'road_accident',
    description: 'Car collision near central traffic signal.',
    location_name: 'Downtown Junction',
    priority_score: 85,
    severity: 4,
    status: 'reported',
  },
  {
    id: 2,
    tracking_id: 'INC-D4E5F6',
    category: 'flooding',
    description: 'Subway station water overflow.',
    location_name: 'Station 4',
    priority_score: 30,
    severity: 2,
    status: 'resolved',
  },
];

describe('IncidentQueue Component', () => {
  it('renders list of incident cards with tracking IDs and priority scores', () => {
    render(
      <IncidentQueue
        incidents={mockIncidents}
        selectedIncident={null}
        onSelectIncident={vi.fn()}
      />
    );

    expect(screen.getByText('INC-A1B2C3')).toBeInTheDocument();
    expect(screen.getByText('INC-D4E5F6')).toBeInTheDocument();
    expect(screen.getByText('P85')).toBeInTheDocument();
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
  });

  it('calls onSelectIncident when a card is clicked', () => {
    const handleSelect = vi.fn();
    render(
      <IncidentQueue
        incidents={mockIncidents}
        selectedIncident={null}
        onSelectIncident={handleSelect}
      />
    );

    fireEvent.click(screen.getByText('INC-A1B2C3'));
    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith(mockIncidents[0]);
  });

  it('filters queue items by search input query', () => {
    render(
      <IncidentQueue
        incidents={mockIncidents}
        selectedIncident={null}
        onSelectIncident={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Filter by ID, hazard, location/i);
    fireEvent.change(searchInput, { target: { value: 'subway' } });

    expect(screen.getByText('INC-D4E5F6')).toBeInTheDocument();
    expect(screen.queryByText('INC-A1B2C3')).not.toBeInTheDocument();
  });
});
