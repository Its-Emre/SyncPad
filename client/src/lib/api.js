// In development, requests go to "/api" and Vite proxies them to the
// Express server (see vite.config.js). In production, VITE_API_URL
// points at the deployed backend.
const API_BASE = import.meta.env.VITE_API_URL || "/api";

// Base URL of the collab WebSocket endpoint (rooms live at
// `${WS_BASE}/<documentId>`). Derived from the API URL in production;
// in development the backend runs on port 5000 directly.
export const WS_BASE =
  import.meta.env.VITE_WS_URL ||
  (import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, "").replace(
        /^http/,
        "ws"
      ) + "/collab"
    : "ws://localhost:5000/collab");

const TOKEN_KEY = "syncpad_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(
      "Could not reach the server. Is the backend running? (On the free tier it may need up to a minute to wake up.)"
    );
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: payload }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload }),
  me: () => request("/auth/me"),

  listDocuments: () => request("/documents"),
  createDocument: (payload) => request("/documents", { method: "POST", body: payload }),
  getDocument: (id) => request(`/documents/${id}`),
  updateDocument: (id, payload) =>
    request(`/documents/${id}`, { method: "PATCH", body: payload }),
  saveContent: (id, content) =>
    request(`/documents/${id}/content`, { method: "PUT", body: { content } }),
  deleteDocument: (id) => request(`/documents/${id}`, { method: "DELETE" }),
  getShareLink: (id) => request(`/documents/${id}/share`),
  joinDocument: (shareId) =>
    request(`/documents/join/${shareId}`, { method: "POST" }),
};
