// src/Component/Admin/AuthContext.jsx
//
// Session state for the admin panel: current user + JWT, backed by
// localStorage so a refresh doesn't log the user out. Deliberately separate
// from anything the public site or a future student portal uses — the admin
// panel's session must never be shared with a "User"-role/student login.

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { adminApi, getStoredToken, setStoredToken } from "./adminApi";

const AuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const me = await adminApi.me(token);
        if (!cancelled) setUser(me);
      } catch {
        // Expired/invalid token — clear it and force re-login.
        if (!cancelled) {
          setStoredToken(null);
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSession();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const login = useCallback(async (userName, password) => {
    const result = await adminApi.login(userName, password);
    setStoredToken(result.token);
    setToken(result.token);
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(() => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (...roles) => !!user && roles.includes(user.role),
    [user]
  );

  return (
    <AuthContext.Provider value={{ token, user, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return ctx;
}
