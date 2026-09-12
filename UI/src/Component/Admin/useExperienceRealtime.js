// src/Component/Admin/useExperienceRealtime.js
//
// Owns the lifecycle of the single shared SignalR connection for the admin
// session. Call this ONCE, from AdminLayout.jsx (mounted for the whole
// authenticated /admin/* tree) — not from individual pages, which would
// start/stop the connection on every navigation.
import { useEffect } from "react";
import { startExperienceHub, stopExperienceHub } from "../../signalr/experienceHubClient";

export function useExperienceRealtime(token) {
  useEffect(() => {
    if (!token) {
      stopExperienceHub();
      return;
    }
    startExperienceHub(token);
    return () => {
      stopExperienceHub();
    };
  }, [token]);
}
