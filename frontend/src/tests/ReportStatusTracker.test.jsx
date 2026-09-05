import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReportStatusTracker from '../components/citizen/ReportStatusTracker';
import * as api from '../services/api';

vi.mock('../services/api', () => ({
  fetchIncidentByTrackingId: vi.fn(),
}));

const incident = (status) => ({
  tracking_id: 'INC-A1B2C3',
  category: 'fire',
  description: 'Industrial fire',
  location_name: 'Industrial Park',
  status,
  severity: 4,
  media_attachments: [],
  created_at: '2026-09-05T10:00:00',
  updated_at: '2026-09-05T10:05:00',
});

const track = async (id = 'INC-A1B2C3') => {
  render(<ReportStatusTracker />);
  fireEvent.change(screen.getByPlaceholderText(/Enter Tracking ID/i), { target: { value: id } });
  fireEvent.click(screen.getByRole('button', { name: /Track/i }));
};

// A step circle is filled only when that step is reached. The old test asserted
// the static STATUS_STEPS labels, which render for every incident - it passed
// even with all the progress logic deleted.
const stepIsDone = (n) => screen.getByText(String(n)).className.includes('bg-sky-500');

describe('ReportStatusTracker Component', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders input field and search button', () => {
    render(<ReportStatusTracker />);
    expect(screen.getByPlaceholderText(/Enter Tracking ID/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Track/i })).toBeInTheDocument();
  });

  it('looks the ID up server-side rather than scanning the incident list', async () => {
    api.fetchIncidentByTrackingId.mockResolvedValue(incident('verified'));
    await track('  inc-a1b2c3  ');

    await waitFor(() => expect(screen.getByText('INC-A1B2C3')).toBeInTheDocument());
    // The whole point of the fix: one targeted request, not a paged list scan
    // that silently missed any report outside the API's 50-row default.
    // The mock factory exports only this function, so had the component still
    // called fetchIncidents the render would have thrown.
    expect(api.fetchIncidentByTrackingId).toHaveBeenCalledTimes(1);
    expect(api.fetchIncidentByTrackingId).toHaveBeenCalledWith('  inc-a1b2c3  ');
  });

  it('marks steps complete up to the current status and no further', async () => {
    api.fetchIncidentByTrackingId.mockResolvedValue(incident('verified'));
    await track();

    await waitFor(() => expect(screen.getByText('INC-A1B2C3')).toBeInTheDocument());
    // verified is step 3 of reported/ai_processing/verified/dispatched/...
    expect(stepIsDone(1)).toBe(true);
    expect(stepIsDone(3)).toBe(true);
    expect(stepIsDone(4)).toBe(false);
    expect(stepIsDone(7)).toBe(false);
  });

  it('completes the whole track for a closed incident', async () => {
    api.fetchIncidentByTrackingId.mockResolvedValue(incident('closed'));
    await track();

    await waitFor(() => expect(screen.getByText('INC-A1B2C3')).toBeInTheDocument());
    // `closed` was absent from STATUS_STEPS, so findIndex returned -1 and every
    // step rendered incomplete - a finished report looked untouched.
    expect(stepIsDone(1)).toBe(true);
    expect(stepIsDone(7)).toBe(true);
    expect(screen.queryByText(/is not one this tracker recognises/i)).not.toBeInTheDocument();
  });

  it('flags a status it does not recognise instead of drawing an empty track', async () => {
    api.fetchIncidentByTrackingId.mockResolvedValue(incident('escalated_to_state'));
    await track();

    await waitFor(() =>
      expect(screen.getByText(/is not one this tracker recognises/i)).toBeInTheDocument()
    );
    expect(stepIsDone(1)).toBe(false);
  });

  it('reports not-found when the lookup returns nothing', async () => {
    api.fetchIncidentByTrackingId.mockResolvedValue(null);
    await track('INC-NOPE');

    await waitFor(() =>
      expect(screen.getByText(/No incident found matching that tracking ID/i)).toBeInTheDocument()
    );
    expect(screen.queryByText('INC-A1B2C3')).not.toBeInTheDocument();
  });

  it('surfaces a network failure as an error, not as a missing incident', async () => {
    api.fetchIncidentByTrackingId.mockRejectedValue(new Error('offline'));
    await track();

    await waitFor(() =>
      expect(screen.getByText(/Error searching tracking system/i)).toBeInTheDocument()
    );
  });
});
