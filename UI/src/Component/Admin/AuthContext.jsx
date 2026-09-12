// src/Component/Admin/AuthContext.jsx
//
// Session state for the admin panel: current user + JWT, backed by
// localStorage so a refresh doesn't log the user out. Deliberately separate
// from anything the public site or a future student portal uses — the admin
// panel's session must never be shared with a "User"-role/student login.
//
// The current-user check (`GET /api/auth/me`) is a TanStack Query so it's
// cached (staleTime: Infinity) instead of re-fetched on every mount that
// happens to read it. login()/logout() still manage the token/localStorage
// directly — those are actions, not cacheable reads.

import { createContext, useCallback, useContext, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, getStoredToken, setStoredToken } from "./adminApi";
import { qk } from "../../queryKeys";

const AuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState(() => getStoredToken());

  const {
    data: user,
    isLoading: loading,
  } = useQuery({
    queryKey: qk.currentUser(),
    queryFn: async () => {
      try {
        return await adminApi.me(token);
      } catch (err) {
        // Expired/invalid token — clear it and force re-login.
        setStoredToken(null);
        setToken(null);
        throw err;
      }
    },
    enabled: !!token,
    staleTime: Infinity,
    retry: false,
  });

  const login = useCallback(async (userName, password) => {
    const result = await adminApi.login(userName, password);
    setStoredToken(result.token);
    setToken(result.token);
    queryClient.setQueryData(qk.currentUser(), result.user);
    return result.user;
  }, [queryClient]);

  const logout = useCallback(() => {
    setStoredToken(null);
    setToken(null);
    // Wipe every cached admin query (experiences/users/forms/currentUser) so
    // a different account logging in on the same browser never sees a
    // stale/leaked previous session's data.
    queryClient.clear();
  }, [queryClient]);

  const hasRole = useCallback(
    (...roles) => !!user && roles.includes(user.role),
    [user]
  );

  return (
    <AuthContext.Provider value={{ token, user: token ? user : null, loading: token ? loading : false, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return ctx;
}
