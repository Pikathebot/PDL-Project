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

export async function fetchIncidentById(id) {
  const response = await fetch(`${API_BASE}/incidents/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch incident details');
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
