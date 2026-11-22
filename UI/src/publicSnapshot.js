// src/publicSnapshot.js
//
// Public walks / seminars / registration forms, read from the snapshot the
// .NET API keeps in Sanity (see hertiagewalkApi PublicSnapshotWorker) instead
// of from the API itself. Sanity's CDN is free and always on, so browsing the
// site never wakes the Azure SQL database — only booking/paying does.
//
// Every function falls back to the API when the snapshot is missing,
// unreadable, or doesn't contain what was asked for (e.g. an experience
// published seconds ago), so the site keeps working exactly as before if the
// Sanity sync isn't configured.
//
// The snapshot is only rebuilt when data changes, so date rules are applied
// here at read time, in India time — the same rules as the API's
// BookingRules.IsBookingOpen: an EndDate / BookingEndDate is inclusive.
// Seats and private dates are re-checked by the API when someone books, so a
// snapshot a few seconds stale can never cause an overbooking.

import { createClient } from "@sanity/client";
import { isTestMode, SITE_ENV_HEADERS } from "./testMode";

const API_BASE = import.meta.env.VITE_API_URL;

// The API writes both snapshots (live and /test) into its own Sanity:Dataset
// ("production"), so this reads there even in test mode. The ids must match
// SanityContentService.UpsertPublicSnapshotAsync.
const snapshotClient = createClient({
  projectId: "nh8jhz7r",
  dataset: "production",
  // Test mode skips the CDN so changes show up instantly while testing.
  useCdn: !isTestMode,
  apiVersion: "2024-04-27",
});
const SNAPSHOT_ID = isTestMode ? "publicSnapshot-test" : "publicSnapshot-live";
const SNAPSHOT_SCHEMA_VERSION = 1;
// One Sanity read per minute at most while a visitor clicks around the site.
const SNAPSHOT_TTL_MS = 60 * 1000;

let cached = null; // { at, promise }

function loadSnapshot() {
  if (cached && Date.now() - cached.at < SNAPSHOT_TTL_MS) return cached.promise;
  const promise = snapshotClient
    .fetch(`*[_id == $id][0]{ data }`, { id: SNAPSHOT_ID })
    .then((doc) => {
      if (!doc?.data) return null;
      const snapshot = JSON.parse(doc.data);
      return snapshot?.schemaVersion === SNAPSHOT_SCHEMA_VERSION ? snapshot : null;
    })
    .catch(() => null); // never fatal — callers fall back to the API
  cached = { at: Date.now(), promise };
  return promise;
}

// ---- India-time date rules -------------------------------------------------

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const todayIst = () => new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);
// The API sends date-only values as "2026-11-20T00:00:00" — compare the date part only.
const dateOnly = (value) => (value ? String(value).slice(0, 10) : null);

/** Bookings stay open through the whole BookingEndDate (India time). */
export function isBookingOpen(bookingEndDate) {
  const end = dateOnly(bookingEndDate);
  return !end || end >= todayIst();
}

const hasNotEnded = (experience) => {
  const end = dateOnly(experience.endDate);
  return !end || end >= todayIst();
};

// The snapshot's bookingEnabled leaves out the date check (see PublicSiteSnapshot).
const withLiveBookingState = (experience) => ({
  ...experience,
  bookingEnabled: !!experience.bookingEnabled && isBookingOpen(experience.bookingEndDate),
});

// ---- Public reads ----------------------------------------------------------

/**
 * Published, not-yet-ended experiences, ordered by start date — same as
 * GET /api/experiences/public. `type` is "walk" | "seminar" | "course" | undefined.
 * Throws if neither the snapshot nor the API can be read.
 */
export async function fetchPublicExperiences({ type } = {}) {
  const snapshot = await loadSnapshot();
  if (snapshot) {
    return snapshot.experiences
      .filter(hasNotEnded)
      .filter((e) => !type || e.type?.toLowerCase() === type.toLowerCase())
      .map(withLiveBookingState);
  }

  const query = new URLSearchParams({ pageSize: "100" });
  if (type) query.set("type", type);
  const res = await fetch(`${API_BASE}/api/experiences/public?${query}`, { headers: SITE_ENV_HEADERS });
  if (!res.ok) throw new Error(`Experience list failed (${res.status})`);
  return (await res.json()).items || [];
}

/**
 * One published experience — same shape as GET /api/experiences/public/{id}.
 * Resolves null when it doesn't exist (404). Throws on any other failure.
 */
export async function fetchPublicExperience(id) {
  const snapshot = await loadSnapshot();
  const fromSnapshot = snapshot?.experiences.find((e) => e.id === id);
  if (fromSnapshot) return withLiveBookingState(fromSnapshot);

  // Not in the snapshot: ask the API, which is authoritative for "not found"
  // (and covers an experience published moments ago).
  const res = await fetch(`${API_BASE}/api/experiences/public/${id}`, { headers: SITE_ENV_HEADERS });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Experience failed (${res.status})`);
  return res.json();
}

/**
 * A public form's schema — same shape as GET /api/forms/{slug}.
 * Resolves null when it doesn't exist or is inactive (404). Throws on any
 * other failure. Only experience registration forms are in the snapshot;
 * standalone forms always come from the API.
 */
export async function fetchPublicForm(slug) {
  const snapshot = await loadSnapshot();
  const fromSnapshot = snapshot?.forms?.[slug];
  if (fromSnapshot) return fromSnapshot;

  const res = await fetch(`${API_BASE}/api/forms/${encodeURIComponent(slug)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Form failed (${res.status})`);
  return res.json();
}
