// src/signalr/experienceHubClient.js
//
// One managed SignalR connection to the Experiences hub for the whole admin
// session — NOT one connection per component. start()/stop() are idempotent;
// call them from a single lifecycle hook (see
// Component/Admin/useExperienceRealtime.js, mounted once in AdminLayout.jsx).
//
// Event handlers update the TanStack Query cache directly via the imported
// queryClient singleton (src/queryClient.js) rather than through React
// context — this file has no React dependency at all.
//
// Payloads are intentionally minimal (see backend IExperienceEventPublisher),
// so every handler here invalidates the affected query key rather than
// hand-patching cached rows with setQueryData. That invalidate is scoped to
// the Experiences resource only — never a global queryClient.invalidateQueries().
import { HubConnectionBuilder, HttpTransportType, LogLevel } from "@microsoft/signalr";
import { queryClient } from "../queryClient";
import { qk } from "../queryKeys";

const API_BASE = import.meta.env.VITE_API_URL;

let connection = null;
let startingPromise = null;

function invalidateExperience(id) {
  if (id) queryClient.invalidateQueries({ queryKey: qk.experience(id) });
  queryClient.invalidateQueries({ queryKey: ["experiences", "list"] });
}

function registerHandlers(conn) {
  conn.on("ExperienceCreated", ({ id }) => invalidateExperience(id));
  conn.on("ExperienceUpdated", ({ id }) => invalidateExperience(id));
  conn.on("ExperienceStatusChanged", ({ id }) => invalidateExperience(id));
  conn.on("ExperiencePublished", ({ id }) => invalidateExperience(id));
  conn.on("ApprovalRequested", ({ id }) => invalidateExperience(id));
  conn.on("BookingUpdated", ({ experienceId }) => invalidateExperience(experienceId));

  conn.onreconnecting((err) => console.warn("[experienceHub] reconnecting…", err?.message));
  conn.onreconnected(() => console.info("[experienceHub] reconnected"));
  conn.onclose((err) => {
    if (err) console.warn("[experienceHub] connection closed", err.message);
  });
}

/** Start the shared connection for this token. No-op if already started/starting. */
export async function startExperienceHub(token) {
  if (!token || !API_BASE) return;
  if (connection && connection.state !== "Disconnected") return;
  if (startingPromise) return startingPromise;

  connection = new HubConnectionBuilder()
    .withUrl(`${API_BASE}/hubs/experience`, {
      accessTokenFactory: () => token,
      transport: HttpTransportType.WebSockets | HttpTransportType.ServerSentEvents | HttpTransportType.LongPolling,
    })
    .withAutomaticReconnect()
    .configureLogging(LogLevel.Warning)
    .build();

  registerHandlers(connection);

  startingPromise = connection.start().catch((err) => {
    console.warn("[experienceHub] failed to connect", err?.message);
  });
  await startingPromise;
  startingPromise = null;
}

/** Stop the shared connection (logout, or app teardown). Safe to call repeatedly. */
export async function stopExperienceHub() {
  if (!connection) return;
  const conn = connection;
  connection = null;
  try {
    await conn.stop();
  } catch {
    // Already stopped/stopping — fine.
  }
}
