// Every call to the backend REST API lives here.

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

async function request(path, { method = 'GET', body, token } = {}) {
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Please check your connection and try again.');
  }
  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) {
    const e = data?.error;
    throw new ApiError(res.status, e?.message || `Request failed (${res.status})`, e?.details);
  }
  return data;
}

const qs = (params) => {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v));
  return q.toString() ? `?${q}` : '';
};

export const api = {
  // ---- public (customers) ----
  getMenu: () => request('/api/menu'),
  placeOrder: (order) => request('/api/orders', { method: 'POST', body: order }),
  getOrder: (id) => request(`/api/orders/${encodeURIComponent(id)}`),

  // ---- staff ----
  login: (username, password) => request('/api/auth/login', { method: 'POST', body: { username, password } }),
  listOrders: (token, params = {}) => request(`/api/orders${qs(params)}`, { token }),
  summary: (token, date) => request(`/api/orders/summary${qs({ date })}`, { token }),
  setOrderStatus: (token, id, status) =>
    request(`/api/orders/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status }, token }),
  createMenuItem: (token, item) => request('/api/menu', { method: 'POST', body: item, token }),
  updateMenuItem: (token, id, changes) =>
    request(`/api/menu/${encodeURIComponent(id)}`, { method: 'PUT', body: changes, token }),
  deleteMenuItem: (token, id) => request(`/api/menu/${encodeURIComponent(id)}`, { method: 'DELETE', token }),
};

// ---- staff session (kept in this browser until it expires) ----
const SESSION_KEY = 'coffee-shop:staff-session';

export function loadSession() {
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY));
    if (s?.token && new Date(s.expiresAt) > new Date()) return s;
  } catch {
    /* ignore */
  }
  return null;
}
export function saveSession(session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}
export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
