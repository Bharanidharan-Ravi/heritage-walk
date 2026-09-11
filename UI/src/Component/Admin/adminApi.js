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
  // Accounts log in with their username (the API also accepts an email here
  // as a fallback for accounts created before usernames existed).
  login: (userName, password) =>
    request("/api/auth/login", { method: "POST", body: { userName, password } }),

  me: (token) => request("/api/auth/me", { token }),

  listUsers: (token) => request("/api/users", { token }),
  createUser: (token, payload) =>
    request("/api/users", { method: "POST", body: payload, token }),
  // Admin reset of another account's login handle and/or password. Send only
  // the field(s) being changed — { userName?, newPassword? }.
  updateUserCredentials: (token, id, payload) =>
    request(`/api/users/${id}/credentials`, { method: "PUT", body: payload, token }),
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

  // ---- Experiences module (Walk/Seminar/Course) --------------------------
  listExperiences: (token, params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""))
    ).toString();
    return request(`/api/experiences${qs ? `?${qs}` : ""}`, { token });
  },
  getExperience: (token, id) => request(`/api/experiences/${id}`, { token }),
  createExperience: (token, payload) =>
    request("/api/experiences", { method: "POST", body: payload, token }),
  updateExperience: (token, id, payload) =>
    request(`/api/experiences/${id}`, { method: "PUT", body: payload, token }),
  setExperiencePayment: (token, id, payload) =>
    request(`/api/experiences/${id}/payment`, { method: "PUT", body: payload, token }),
  submitExperience: (token, id) =>
    request(`/api/experiences/${id}/submit`, { method: "POST", token }),
  approveExperience: (token, id) =>
    request(`/api/experiences/${id}/approve`, { method: "POST", token }),
  requestExperienceChanges: (token, id, reason) =>
    request(`/api/experiences/${id}/request-changes`, { method: "POST", body: { reason }, token }),
  publishExperience: (token, id) =>
    request(`/api/experiences/${id}/publish`, { method: "POST", token }),
  closeExperience: (token, id) =>
    request(`/api/experiences/${id}/close`, { method: "POST", token }),
  retryExperienceSync: (token, id) =>
    request(`/api/experiences/${id}/sync-retry`, { method: "POST", token }),
};
