// All requests to FastAPI go through this small helper.
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const OFFICER_KEY = import.meta.env.VITE_DEMO_OFFICER_KEY || 'local-demo-officer-key';

export async function api(path, options = {}, officer = false) {
  const response = await fetch(`${BASE}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(officer ? { 'X-Officer-Key': OFFICER_KEY } : {}),
      ...options.headers,
    },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Request failed');
  return data;
}
export const post = (path, body, officer = false) => api(path, { method: 'POST', body: JSON.stringify(body) }, officer);
export const patch = (path, body, officer = false) => api(path, { method: 'PATCH', body: JSON.stringify(body) }, officer);
