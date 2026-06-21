// Thin fetch wrapper for the backend. Always sends cookies (credentials:
// 'include') so the httpOnly session cookie rides along. Throws an Error with
// .status and .data on non-2xx so callers can branch on the response.
export async function api(path, { method = 'GET', body, ...opts } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(data.error || 'Something went wrong'), { status: res.status, data });
  }
  return data;
}
