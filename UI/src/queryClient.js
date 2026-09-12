// src/queryClient.js
//
// The single TanStack Query client for the whole app. Exported as a module
// singleton (not created inside a component) so both the React tree — via
// <QueryClientProvider> in main.jsx — and code outside React (the SignalR
// event handlers in src/signalr/experienceHubClient.js) can read/write the
// same cache. Never construct a second QueryClient anywhere.
//
// Defaults favor NOT refetching unless something actually changed: no
// window-focus/reconnect refetching, a moderate default staleTime for
// anything that doesn't set its own. Static admin-panel data (experiences,
// forms, users, currentUser) opts into staleTime: Infinity at the call site
// and is kept correct instead via explicit invalidation (mutations) or
// SignalR-driven invalidation — see useExperienceRealtime.js.
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
