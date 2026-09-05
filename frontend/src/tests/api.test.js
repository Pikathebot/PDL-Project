import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  submitIncidentReport,
  fetchIncidents,
  fetchIncidentByTrackingId,
  updateIncidentStatus,
  fetchNearestResponders,
  dispatchResponder,
  fetchAnalyticsSummary,
} from '../services/api';

// Every other suite mocks ../services/api at module level, so until now nothing
// exercised the module itself: URLs, methods and request bodies were untested.

const okJson = (body) => ({ ok: true, status: 200, json: async () => body });

let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(okJson({}));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

const lastCall = () => fetchMock.mock.calls.at(-1);
const lastUrl = () => lastCall()[0];
const lastInit = () => lastCall()[1] ?? {};

describe('services/api request shapes', () => {
  it('posts a report as multipart FormData without forcing a Content-Type', async () => {
    const form = new FormData();
    form.append('description', 'Smoke visible');
    await submitIncidentReport(form);

    expect(lastUrl()).toBe('/api/v1/incidents/');
    expect(lastInit().method).toBe('POST');
    expect(lastInit().body).toBe(form);
    // Setting Content-Type by hand would strip the multipart boundary.
    expect(lastInit().headers).toBeUndefined();
  });

  it('builds a query string only when filters are supplied', async () => {
    await fetchIncidents();
    expect(lastUrl()).toBe('/api/v1/incidents/');

    await fetchIncidents({ category: 'fire', limit: 10 });
    expect(lastUrl()).toBe('/api/v1/incidents/?category=fire&limit=10');
  });

  it('looks up a tracking ID on the dedicated endpoint and URL-encodes it', async () => {
    await fetchIncidentByTrackingId('  INC-A1/B2  ');
    expect(lastUrl()).toBe('/api/v1/incidents/track/INC-A1%2FB2');
  });

  it('returns null rather than throwing when a tracking ID is not found', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
    await expect(fetchIncidentByTrackingId('INC-NOPE')).resolves.toBeNull();
  });

  it('still throws for tracking lookups that fail for other reasons', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    await expect(fetchIncidentByTrackingId('INC-A1B2C3')).rejects.toThrow(/tracking/i);
  });

  it('PATCHes status as JSON', async () => {
    await updateIncidentStatus(7, 'dispatched', 3);

    expect(lastUrl()).toBe('/api/v1/incidents/7/status');
    expect(lastInit().method).toBe('PATCH');
    expect(lastInit().headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(lastInit().body)).toEqual({ status: 'dispatched', assigned_responder_id: 3 });
  });

  it('omits a responder assignment as null when none is given', async () => {
    await updateIncidentStatus(7, 'resolved');
    // The backend guards on `is not None`, so null leaves the assignment intact.
    expect(JSON.parse(lastInit().body)).toEqual({ status: 'resolved', assigned_responder_id: null });
  });

  it('requests nearest responders with a limit', async () => {
    await fetchNearestResponders(12, 3);
    expect(lastUrl()).toBe('/api/v1/incidents/12/nearest-responders?limit=3');
  });

  it('dispatches a responder as JSON', async () => {
    await dispatchResponder(12, 5);
    expect(lastUrl()).toBe('/api/v1/incidents/12/dispatch');
    expect(lastInit().method).toBe('POST');
    expect(JSON.parse(lastInit().body)).toEqual({ responder_id: 5 });
  });

  it('fetches the analytics summary', async () => {
    await fetchAnalyticsSummary();
    expect(lastUrl()).toBe('/api/v1/incidents/analytics/summary');
  });

  it.each([
    ['submitIncidentReport', () => submitIncidentReport(new FormData())],
    ['fetchIncidents', () => fetchIncidents()],
    ['updateIncidentStatus', () => updateIncidentStatus(1, 'resolved')],
    ['fetchNearestResponders', () => fetchNearestResponders(1)],
    ['dispatchResponder', () => dispatchResponder(1, 2)],
    ['fetchAnalyticsSummary', () => fetchAnalyticsSummary()],
  ])('%s rejects on a non-ok response instead of returning undefined', async (_name, call) => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    await expect(call()).rejects.toThrow();
  });
});
