const API_BASE = '/api/v1';

export async function submitIncidentReport(formData) {
  const response = await fetch(`${API_BASE}/incidents/`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    throw new Error('Failed to submit incident report');
  }
  return response.json();
}

export async function fetchIncidents(params = {}) {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${API_BASE}/incidents/${query ? `?${query}` : ''}`);
  if (!response.ok) {
    throw new Error('Failed to fetch incidents list');
  }
  return response.json();
}

export async function fetchIncidentByTrackingId(trackingId) {
  const response = await fetch(`${API_BASE}/incidents/track/${encodeURIComponent(trackingId.trim())}`);
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error('Failed to look up tracking ID');
  }
  return response.json();
}

export async function updateIncidentStatus(id, status, assignedResponderId = null) {
  const response = await fetch(`${API_BASE}/incidents/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, assigned_responder_id: assignedResponderId }),
  });
  if (!response.ok) {
    throw new Error('Failed to update incident status');
  }
  return response.json();
}

export async function fetchNearestResponders(incidentId, limit = 5) {
  const response = await fetch(`${API_BASE}/incidents/${incidentId}/nearest-responders?limit=${limit}`);
  if (!response.ok) {
    throw new Error('Failed to fetch nearest responders');
  }
  return response.json();
}

export async function dispatchResponder(incidentId, responderId) {
  const response = await fetch(`${API_BASE}/incidents/${incidentId}/dispatch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ responder_id: responderId }),
  });
  if (!response.ok) {
    throw new Error('Failed to dispatch responder');
  }
  return response.json();
}

export async function fetchAnalyticsSummary() {
  const response = await fetch(`${API_BASE}/incidents/analytics/summary`);
  if (!response.ok) {
    throw new Error('Failed to fetch analytics summary');
  }
  return response.json();
}
