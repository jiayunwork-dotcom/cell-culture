const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export async function generateReport(roomId, playerId) {
  const res = await fetch(`${API_URL}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, playerId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to generate report');
  return data.report;
}

export async function getReport(reportId) {
  const res = await fetch(`${API_URL}/api/reports/${reportId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to get report');
  return data;
}

export async function submitReview(reportId, reviewerId, reviewerName, rating, comment) {
  const res = await fetch(`${API_URL}/api/reports/${reportId}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reviewerId, reviewerName, rating, comment }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to submit review');
  return data.review;
}

export async function listReports(sortBy = 'time', cursor = '') {
  const params = new URLSearchParams();
  params.append('sortBy', sortBy);
  if (cursor) params.append('cursor', cursor);
  const res = await fetch(`${API_URL}/api/reports?${params.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to list reports');
  return data;
}

export function parseJSONField(str, fallback) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}
