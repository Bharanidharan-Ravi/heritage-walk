// tests/publicSnapshot.test.mjs
//
// Scenario tests for src/publicSnapshot.js — run with `npm test` (plain Node,
// no test framework needed). Loads the real module with @sanity/client,
// ./testMode and import.meta.env swapped for mocks, so it checks the actual
// date rules / fallbacks the public site uses — never touches Sanity or the API.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const modulePath = process.argv[2] ?? fileURLToPath(new URL("../src/publicSnapshot.js", import.meta.url));
const source = readFileSync(modulePath, "utf8")
  .replace(/import \{ createClient \} from "@sanity\/client";/, "const { createClient } = globalThis.__mocks.sanity;")
  .replace(/import \{ isTestMode, SITE_ENV_HEADERS \} from "\.\/testMode";/, "const { isTestMode, SITE_ENV_HEADERS } = globalThis.__mocks.testMode;")
  .replace(/import\.meta\.env\.VITE_API_URL/g, '"https://api.test"');
assert.ok(!/^import /m.test(source), "unexpected import left in publicSnapshot.js");

const realNow = Date.now;
let nonce = 0;

/** Fresh module instance (its 60s cache starts empty) with scripted Sanity + API. */
async function load({ snapshot, sanityThrows = false, testMode = false, api = {}, nowIso = "2026-11-20T06:00:00Z" } = {}) {
  const calls = { sanity: [], api: [], clientConfig: null };
  let now = Date.parse(nowIso);
  Date.now = () => now;
  globalThis.__mocks = {
    testMode: { isTestMode: testMode, SITE_ENV_HEADERS: testMode ? { "X-Site-Env": "test" } : {} },
    sanity: {
      createClient: (config) => {
        calls.clientConfig = config;
        return {
          fetch: async (query, params) => {
            calls.sanity.push(params);
            if (sanityThrows) throw new Error("sanity down");
            return snapshot === undefined ? null : { data: JSON.stringify(snapshot) };
          },
        };
      },
    },
  };
  globalThis.fetch = async (url, init) => {
    calls.api.push({ url, headers: init?.headers ?? {} });
    const path = url.replace("https://api.test", "");
    const [status, body] = api[path.split("?")[0]] ?? [500, {}];
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
  const mod = await import(`data:text/javascript,${encodeURIComponent(source + `\n// ${nonce++}`)}`);
  return { mod, calls, advance: (ms) => { now += ms; } };
}

const exp = (o) => ({ id: o.id, type: "Walk", title: o.id, bookingEnabled: true, endDate: null, bookingEndDate: null, ...o });
const snap = (experiences, forms = {}) => ({ schemaVersion: 1, experiences, forms });

const tests = [];
const test = (name, fn) => tests.push({ name, fn });

// ---- List ------------------------------------------------------------------

test("list comes from the snapshot — no API call (DB stays asleep)", async () => {
  const { mod, calls } = await load({ snapshot: snap([exp({ id: "a" }), exp({ id: "b", type: "Seminar" })]) });
  const all = await mod.fetchPublicExperiences();
  assert.deepEqual(all.map((e) => e.id), ["a", "b"]);
  assert.equal(calls.api.length, 0);
});

test("list filters by type, case-insensitively", async () => {
  const { mod } = await load({ snapshot: snap([exp({ id: "a" }), exp({ id: "b", type: "Seminar" })]) });
  assert.deepEqual((await mod.fetchPublicExperiences({ type: "seminar" })).map((e) => e.id), ["b"]);
  assert.deepEqual((await mod.fetchPublicExperiences({ type: "course" })).map((e) => e.id), []);
});

test("ended yesterday is hidden, ending today is shown (EndDate inclusive)", async () => {
  const { mod } = await load({
    nowIso: "2026-11-20T06:00:00Z",
    snapshot: snap([exp({ id: "yesterday", endDate: "2026-11-19T00:00:00" }), exp({ id: "today", endDate: "2026-11-20T00:00:00" })]),
  });
  assert.deepEqual((await mod.fetchPublicExperiences()).map((e) => e.id), ["today"]);
});

test("booking end date: open all of 20 Nov India time, closed from 21 Nov", async () => {
  const s = snap([exp({ id: "x", bookingEndDate: "2026-11-20T00:00:00" })]);
  // 23:59 IST on 20 Nov = 18:29 UTC
  let { mod } = await load({ snapshot: s, nowIso: "2026-11-20T18:29:00Z" });
  assert.equal((await mod.fetchPublicExperience("x")).bookingEnabled, true);
  // 00:01 IST on 21 Nov = 18:31 UTC on 20 Nov — closed although UTC still says the 20th
  ({ mod } = await load({ snapshot: s, nowIso: "2026-11-20T18:31:00Z" }));
  assert.equal((await mod.fetchPublicExperience("x")).bookingEnabled, false);
  // early morning 20 Nov IST (still 19 Nov UTC) — open
  ({ mod } = await load({ snapshot: s, nowIso: "2026-11-19T19:00:00Z" }));
  assert.equal((await mod.fetchPublicExperience("x")).bookingEnabled, true);
});

test("isBookingOpen: no end date = open", async () => {
  const { mod } = await load({ snapshot: snap([]) });
  assert.equal(mod.isBookingOpen(null), true);
  assert.equal(mod.isBookingOpen(undefined), true);
  assert.equal(mod.isBookingOpen("2026-11-20"), true);
  assert.equal(mod.isBookingOpen("2026-11-19T00:00:00"), false);
});

test("snapshot's own bookingEnabled=false (sold out / no form) is never switched on", async () => {
  const { mod } = await load({ snapshot: snap([exp({ id: "x", bookingEnabled: false, bookingEndDate: "2030-01-01T00:00:00" })]) });
  assert.equal((await mod.fetchPublicExperience("x")).bookingEnabled, false);
});

// ---- Fallbacks ---------------------------------------------------------------

test("no snapshot yet → list from the API", async () => {
  const { mod, calls } = await load({ api: { "/api/experiences/public": [200, { items: [{ id: "api" }] }] } });
  assert.deepEqual(await mod.fetchPublicExperiences({ type: "walk" }), [{ id: "api" }]);
  assert.match(calls.api[0].url, /pageSize=100&type=walk$/);
});

test("Sanity unreachable → API, and the error is not thrown", async () => {
  const { mod } = await load({ sanityThrows: true, api: { "/api/experiences/public": [200, { items: [] }] } });
  assert.deepEqual(await mod.fetchPublicExperiences(), []);
});

test("snapshot with a different schemaVersion is ignored → API", async () => {
  const { mod, calls } = await load({
    snapshot: { schemaVersion: 2, experiences: [exp({ id: "a" })], forms: {} },
    api: { "/api/experiences/public": [200, { items: [{ id: "api" }] }] },
  });
  assert.deepEqual((await mod.fetchPublicExperiences()).map((e) => e.id), ["api"]);
  assert.equal(calls.api.length, 1);
});

test("both down → list throws (page shows its error message)", async () => {
  const { mod } = await load({ sanityThrows: true });
  await assert.rejects(mod.fetchPublicExperiences());
});

// ---- Detail -------------------------------------------------------------------

test("detail not in snapshot (published seconds ago) → API", async () => {
  const { mod, calls } = await load({ snapshot: snap([]), api: { "/api/experiences/public/new": [200, { id: "new" }] } });
  assert.deepEqual(await mod.fetchPublicExperience("new"), { id: "new" });
  assert.equal(calls.api.length, 1);
});

test("detail 404 → null (page shows 'not found'); 500 → throws", async () => {
  let { mod } = await load({ snapshot: snap([]), api: { "/api/experiences/public/gone": [404, {}] } });
  assert.equal(await mod.fetchPublicExperience("gone"), null);
  ({ mod } = await load({ snapshot: snap([]) }));
  await assert.rejects(mod.fetchPublicExperience("broken"));
});

// ---- Forms ----------------------------------------------------------------------

test("experience registration form comes from the snapshot", async () => {
  const form = { id: "f", slug: "reg-1", price: 500, experienceId: "x" };
  const { mod, calls } = await load({ snapshot: snap([], { "reg-1": form }) });
  assert.deepEqual(await mod.fetchPublicForm("reg-1"), form);
  assert.equal(calls.api.length, 0);
});

test("standalone form → API with the slug encoded; 404 → null", async () => {
  const { mod, calls } = await load({ snapshot: snap([]), api: { "/api/forms/a%20b": [200, { slug: "a b" }], "/api/forms/missing": [404, {}] } });
  assert.deepEqual(await mod.fetchPublicForm("a b"), { slug: "a b" });
  assert.equal(calls.api[0].url, "https://api.test/api/forms/a%20b");
  assert.equal(await mod.fetchPublicForm("missing"), null);
});

// ---- Cache + test site ------------------------------------------------------------

test("one Sanity read per minute while clicking around", async () => {
  const { mod, calls, advance } = await load({ snapshot: snap([exp({ id: "a" })]) });
  await mod.fetchPublicExperiences();
  await mod.fetchPublicExperience("a");
  await mod.fetchPublicForm("none-in-snapshot").catch(() => {});
  assert.equal(calls.sanity.length, 1);
  advance(61_000);
  await mod.fetchPublicExperiences();
  assert.equal(calls.sanity.length, 2);
});

test("live site reads publicSnapshot-live via the CDN", async () => {
  const { mod, calls } = await load({ snapshot: snap([]) });
  await mod.fetchPublicExperiences();
  assert.deepEqual(calls.sanity[0], { id: "publicSnapshot-live" });
  assert.equal(calls.clientConfig.useCdn, true);
  assert.equal(calls.clientConfig.dataset, "production");
});

test("/test site reads publicSnapshot-test, skips the CDN, and tags API calls", async () => {
  const { mod, calls } = await load({ testMode: true, api: { "/api/experiences/public": [200, { items: [] }] } });
  await mod.fetchPublicExperiences();
  assert.deepEqual(calls.sanity[0], { id: "publicSnapshot-test" });
  assert.equal(calls.clientConfig.useCdn, false);
  assert.deepEqual(calls.api[0].headers, { "X-Site-Env": "test" });
});

// ---- Run ----------------------------------------------------------------------------

let failed = 0;
for (const t of tests) {
  try { await t.fn(); console.log(`  ✓ ${t.name}`); }
  catch (e) { failed++; console.log(`  ✗ ${t.name}\n    ${e.message.split("\n").join("\n    ")}`); }
}
Date.now = realNow;
console.log(`\n${tests.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
