// src/Component/Admin/adminApi.js
//
// Thin fetch wrapper for the admin panel's calls to the .NET API. Reads the
// base URL from VITE_API_URL, same env var Contact.jsx already uses — never
// hardcode the API host.

const API_BASE = import.meta.env.VITE_API_URL;
const TOKEN_STORAGE_KEY = "archaeotrails_admin_token";

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // localStorage unavailable (private mode, etc.) — session just won't persist.
  }
}

async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // no JSON body (e.g. 204) — fine.
  }

  if (!response.ok) {
    const message = data?.message || `Request failed (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const adminApi = {
  login: (email, password) =>
    request("/api/auth/login", { method: "POST", body: { email, password } }),

  me: (token) => request("/api/auth/me", { token }),

  listUsers: (token) => request("/api/users", { token }),
  createUser: (token, payload) =>
    request("/api/users", { method: "POST", body: payload, token }),
  updateUserRole: (token, id, role) =>
    request(`/api/users/${id}/role`, { method: "PUT", body: { role }, token }),
  updateUserStatus: (token, id, isActive) =>
    request(`/api/users/${id}/status`, { method: "PUT", body: { isActive }, token }),

  listForms: (token) => request("/api/forms", { token }),
  createForm: (token, payload) =>
    request("/api/forms", { method: "POST", body: payload, token }),
  updateFormStatus: (token, id, isActive) =>
    request(`/api/forms/${id}/status`, { method: "PUT", body: { isActive }, token }),
  listSubmissions: (token, formId) =>
    request(`/api/forms/${formId}/submissions`, { token }),
};
