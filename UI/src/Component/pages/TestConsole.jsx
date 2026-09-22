// src/Component/pages/TestConsole.jsx
//
// Private QA console at /test — NOT linked from any nav, noindex, and only
// rendered in dev (`npm run dev`) or when VITE_ENABLE_TEST_PAGE=true. In a
// normal production build it renders "Not found", so it isn't exposed.
//
// Covers: env/config check, Sanity connectivity (production or `test`
// dataset), API health, contact-email test, and creating [TEST] free/paid
// forms + a Razorpay order-mode check. Sanity seed data lives in
// hertiagewalk-backend/test-data/.

import React, { useEffect, useState } from "react";
import { createClient } from "@sanity/client";
import { adminApi } from "../Admin/adminApi";

const API_BASE = import.meta.env.VITE_API_URL;
const ENABLED =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_TEST_PAGE === "true";

const SANITY_TYPES = ["walk", "blogPost", "galleryItem", "story", "shopItem", "contact"];

const nameField = (id) => ({
  id, name: "fullName", label: "Full name", type: "text", required: true,
  placeholder: "", helpText: "", options: [], width: "full", role: "submitterName",
});
const emailField = (id) => ({
  id, name: "email", label: "Email", type: "email", required: true,
  placeholder: "", helpText: "", options: [], width: "full", role: "submitterEmail",
});

function testFormPayload(paid) {
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  return {
    title: `[TEST] ${paid ? "Paid ₹1" : "Free"} form ${stamp}`,
    description: "Created from /test. Safe to deactivate.",
    requiresPayment: paid,
    price: paid ? 1 : 0,
    currency: "INR",
    fields: [nameField("t1"), emailField("t2")],
  };
}

export default function TestConsole() {
  if (!ENABLED) {
    return <div className="p-20 text-center text-xl">Not found</div>;
  }
  return <Console />;
}

function Console() {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Test console</h1>
          <p className="text-sm text-stone-600">
            Private QA page. Not linked anywhere; hidden in production builds.
          </p>
        </header>
        <EnvCard />
        <SanityCard />
        <ApiCard />
        <ContactCard />
        <FormsCard />
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <section className="bg-white rounded-lg shadow-sm border border-stone-200 p-5">
      <h2 className="font-semibold mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Btn({ busy, ...props }) {
  return (
    <button
      {...props}
      disabled={busy || props.disabled}
      className="px-3 py-1.5 rounded bg-stone-900 text-white text-sm disabled:opacity-50"
    />
  );
}

function Out({ value }) {
  if (value === null || value === undefined) return null;
  return (
    <pre className="mt-3 text-xs bg-stone-900 text-green-300 p-3 rounded overflow-auto max-h-64">
      {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
    </pre>
  );
}

function EnvCard() {
  const [rz, setRz] = useState(false);
  useEffect(() => {
    setRz(typeof window.Razorpay !== "undefined");
  }, []);
  const rows = [
    ["VITE_API_URL", API_BASE || "MISSING"],
    ["Sanity project", "nh8jhz7r"],
    ["Razorpay checkout.js loaded", rz ? "yes" : "NO — check index.html"],
    ["Mode", import.meta.env.DEV ? "dev" : "production build (VITE_ENABLE_TEST_PAGE)"],
  ];
  return (
    <Card title="1. Environment">
      <table className="text-sm">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td className="pr-4 text-stone-500">{k}</td>
              <td className="font-mono">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function SanityCard() {
  const [dataset, setDataset] = useState("production");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState(null);

  const run = async () => {
    setBusy(true);
    setOut(null);
    try {
      const client = createClient({
        projectId: "nh8jhz7r",
        dataset,
        useCdn: false,
        apiVersion: "2024-04-27",
      });
      const counts = {};
      for (const t of SANITY_TYPES) {
        counts[t] = await client.fetch(`count(*[_type == $t])`, { t });
      }
      const testDocs = await client.fetch(
        `*[_id match "test-*"]{_id, _type, "label": coalesce(title, name)}`
      );
      setOut({ dataset, counts, testDocs });
    } catch (e) {
      setOut(`Failed: ${e.message} (a private dataset needs a read token; public site can't see it)`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="2. Sanity">
      <div className="flex gap-2 items-center">
        <select
          value={dataset}
          onChange={(e) => setDataset(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option>production</option>
          <option>test</option>
        </select>
        <Btn busy={busy} onClick={run}>Count documents + find test-* docs</Btn>
      </div>
      <p className="text-xs text-stone-500 mt-2">
        Seed data: <code>hertiagewalk-backend/test-data/test-data.ndjson</code> (see README there).
        Note: a <em>private</em> dataset can't be read from the browser without a token — use{" "}
        <code>--visibility public</code> for the test dataset if you want this check to work, or
        just check in Studio.
      </p>
      <Out value={out} />
    </Card>
  );
}

function ApiCard() {
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState(null);
  const run = async () => {
    setBusy(true);
    const res = {};
    for (const path of ["/api/experiences/public", "/api/forms/__nonexistent__"]) {
      const t = performance.now();
      try {
        const r = await fetch(`${API_BASE}${path}`);
        res[path] = `${r.status} in ${Math.round(performance.now() - t)}ms`;
      } catch (e) {
        res[path] = `NETWORK/CORS ERROR: ${e.message}`;
      }
    }
    setOut(res);
    setBusy(false);
  };
  return (
    <Card title="3. API reachability + CORS">
      <Btn busy={busy} onClick={run}>Ping API</Btn>
      <p className="text-xs text-stone-500 mt-2">
        Expect 200 for the first and 404 for the second. A network error usually means the API is
        down or this origin isn't in the CORS list.
      </p>
      <Out value={out} />
    </Card>
  );
}

function ContactCard() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState(null);
  const run = async () => {
    setBusy(true);
    try {
      const r = await fetch(`${API_BASE}/api/contact/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: "[TEST] Console",
          userEmail: email,
          message: "Test message sent from /test",
        }),
      });
      setOut(`HTTP ${r.status}`);
    } catch (e) {
      setOut(`Failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card title="4. Contact email (sends a real email to the site owner)">
      <div className="flex gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your test email"
          className="border rounded px-2 py-1 text-sm flex-1"
        />
        <Btn busy={busy || !email} onClick={run}>Send</Btn>
      </div>
      <Out value={out} />
    </Card>
  );
}

function FormsCard() {
  // Prefill only in a local `npm run dev` build (import.meta.env.DEV) — never
  // in a built bundle, even one shipped with VITE_ENABLE_TEST_PAGE=true for a
  // live deploy. A production JS bundle is publicly readable, so a real
  // admin password must never be baked into one; on a live build these two
  // fields start blank and are typed in by hand, same as any other login.
  const [userName, setUserName] = useState(import.meta.env.DEV ? "swathi2" : "");
  const [password, setPassword] = useState(import.meta.env.DEV ? "Swathi@0202" : "");
  const [token, setToken] = useState(null);
  const [created, setCreated] = useState([]);
  const [orderCheck, setOrderCheck] = useState(null);
  const [msg, setMsg] = useState("");

  const login = async () => {
    setMsg("");
    try {
      const r = await adminApi.login(userName, password);
      setToken(r.token);
    } catch (e) {
      setMsg(e.message);
    }
  };

  const create = async (paid) => {
    setMsg("");
    try {
      const r = await adminApi.createForm(token, testFormPayload(paid));
      setCreated((c) => [{ slug: r.slug, paid }, ...c]);
    } catch (e) {
      setMsg(e.message);
    }
  };

  const checkOrder = async (slug) => {
    setOrderCheck("...");
    try {
      const r = await fetch(`${API_BASE}/api/forms/${slug}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const d = await r.json();
      const keyId = d.razorpayKeyId || "";
      setOrderCheck({
        status: r.status,
        mode: keyId.startsWith("rzp_test_")
          ? "TEST mode — safe, no real money"
          : keyId.startsWith("rzp_live_")
          ? "LIVE mode — real charges! use ₹1 form only"
          : "unknown / missing key",
        orderId: d.orderId,
        amount: d.amount,
      });
    } catch (e) {
      setOrderCheck(`Failed: ${e.message}`);
    }
  };

  return (
    <Card title="5. Forms + Razorpay payment">
      {!token ? (
        <div className="flex gap-2 flex-wrap">
          <input value={userName} onChange={(e) => setUserName(e.target.value)}
            placeholder="admin username" className="border rounded px-2 py-1 text-sm" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="password" className="border rounded px-2 py-1 text-sm" />
          <Btn onClick={login}>Admin login</Btn>
        </div>
      ) : (
        <div className="flex gap-2">
          <Btn onClick={() => create(false)}>Create free [TEST] form</Btn>
          <Btn onClick={() => create(true)}>Create paid ₹1 [TEST] form</Btn>
        </div>
      )}
      {msg && <p className="text-sm text-red-600 mt-2">{msg}</p>}

      <ul className="mt-3 space-y-2 text-sm">
        {created.map((f) => (
          <li key={f.slug} className="flex gap-3 items-center">
            <a className="text-blue-700 underline" href={`/test/forms/${f.slug}`} target="_blank" rel="noreferrer">
              /test/forms/{f.slug}
            </a>
            <span className="text-stone-500">{f.paid ? "paid ₹1" : "free"}</span>
            {f.paid && (
              <button className="underline" onClick={() => checkOrder(f.slug)}>
                check Razorpay mode
              </button>
            )}
          </li>
        ))}
      </ul>
      <Out value={orderCheck} />

      <div className="mt-4 text-xs text-stone-600 space-y-1">
        <p className="font-medium">Razorpay TEST-mode credentials (only work with rzp_test_ keys):</p>
        <p>Card: 4111 1111 1111 1111 · any future expiry · any CVV · OTP 1111 (or pick “Success” on the bank page)</p>
        <p>UPI success: <code>success@razorpay</code> · UPI failure: <code>failure@razorpay</code></p>
        <p>
          Live-testing safely: keep keys in <code>rzp_live_</code> only if you must; use the ₹1 form
          and refund it from the Razorpay dashboard. After paying, check the submissions page in
          admin and both emails (owner + submitter).
        </p>
      </div>
    </Card>
  );
}
