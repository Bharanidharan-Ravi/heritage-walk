// src/Component/pages/admin/AdminExperiences.jsx
//
// The Experiences management page — replaces the old combined "Programs &
// Forms" landing. Walk/Seminar/Course experiences, server-side paginated/
// searched/sorted/filtered, with the Employee -> Admin approval workflow.
// The existing Form Generator lives on unchanged at /admin/forms — this page
// only *links* to a FormTemplate for booking (see SetPaymentModal).
//
// Fixed layout: header/tabs/toolbar/table-head/footer stay in place; only the
// table body scrolls — see the h-[calc(100vh-2rem)] flex column below.

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../Admin/AuthContext";
import { adminApi } from "../../Admin/adminApi";
import { adminConfig } from "../../Config/admin.config";
import { adminUi } from "../../Config/adminUi.config";
import CreateExperienceModal from "../../Admin/CreateExperienceModal";

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "active", label: "Active" },
  { key: "closed", label: "Closed" },
];

const TYPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "walk", label: "Walk" },
  { value: "seminar", label: "Seminar" },
  { value: "course", label: "Course" },
];

const SORTS = [
  { value: "updated_desc", label: "Most recently updated" },
  { value: "title_asc", label: "Title A-Z" },
  { value: "title_desc", label: "Title Z-A" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "bookingenddate_asc", label: "Booking closes: earliest" },
  { value: "bookingenddate_desc", label: "Booking closes: latest" },
  { value: "startdate_asc", label: "Start date: earliest" },
  { value: "startdate_desc", label: "Start date: latest" },
];

const STATUS_BADGE = {
  Draft: { label: "DRAFT", bg: "rgba(244,241,234,0.12)", fg: "#F4F1EA" },
  ChangesRequested: { label: "CHANGES REQUESTED", bg: "rgba(224,108,108,0.15)", fg: "#E06C6C" },
  AwaitingApproval: { label: "AWAITING APPROVAL", bg: "rgba(193,157,96,0.18)", fg: "#C19D60" },
  Approved: { label: "APPROVED", bg: "rgba(108,193,157,0.15)", fg: "#6CC19D" },
  Published: { label: "LIVE", bg: "rgba(108,193,157,0.2)", fg: "#6CC19D" },
  Closed: { label: "CLOSED", bg: "rgba(244,241,234,0.1)", fg: "rgba(244,241,234,0.6)" },
};

const EMPTY_MESSAGE = {
  pending: "No pending experiences.",
  active: "No active experiences.",
  closed: "No closed experiences.",
};

export default function AdminExperiences() {
  const { token, user } = useAdminAuth();
  const navigate = useNavigate();
  const { theme, roles } = adminConfig;
  const { text, control, table } = adminUi;
  const isAdmin = user?.role === roles.ADMIN;

  const [tab, setTab] = useState("active");
  const [type, setType] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("updated_desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [changesTarget, setChangesTarget] = useState(null);
  const [rowBusyId, setRowBusyId] = useState(null);

  // Debounce search -> reset to page 1 when it actually changes.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = async () => {
    setLoading(true);
    try {
      const result = await adminApi.listExperiences(token, { tab, type, search, sort, page, pageSize });
      setItems(result.items);
      setTotalCount(result.totalCount);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load experiences.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, type, search, sort, page, pageSize]);

  // Selection clears whenever the underlying result set could have changed.
  useEffect(() => { setSelected(new Set()); }, [tab, type, search, page]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(totalCount, page * pageSize);

  const allVisibleSelected = items.length > 0 && items.every((it) => selected.has(it.id));
  const toggleSelectAll = () => {
    setSelected(allVisibleSelected ? new Set() : new Set(items.map((it) => it.id)));
  };
  const toggleRow = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const runRowAction = async (id, fn, errorMessage) => {
    setRowBusyId(id);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err.message || errorMessage);
    } finally {
      setRowBusyId(null);
    }
  };

  const closableSelected = useMemo(
    () => items.filter((it) => selected.has(it.id) && isAdmin && it.status === "Published"),
    [items, selected, isAdmin]
  );

  const handleBulkClose = async () => {
    setError("");
    for (const row of closableSelected) {
      try {
        await adminApi.closeExperience(token, row.id);
      } catch (err) {
        setError(err.message || "Failed to close one or more experiences.");
      }
    }
    setSelected(new Set());
    await load();
  };

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col">
      {/* ---- fixed chrome ---- */}
      <header className="flex flex-wrap items-center justify-between gap-2 mb-3 shrink-0">
        <h1 className={text.header}>Experiences</h1>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className={control.btnPrimary}
          style={{ backgroundColor: theme.accentColor, color: theme.sidebarBackground }}
        >
          + New Experience
        </button>
      </header>

      <div className="flex items-center gap-1 mb-3 shrink-0 border-b" style={{ borderColor: theme.borderColor }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => { setTab(t.key); setPage(1); }}
            className={`${text.micro} px-3 py-2 border-b-2 transition-colors`}
            style={{
              borderColor: tab === t.key ? theme.accentColor : "transparent",
              color: tab === t.key ? theme.accentColor : theme.textColor,
              opacity: tab === t.key ? 1 : 0.6,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3 shrink-0">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search experiences..."
          aria-label="Search experiences..."
          className={`${control.input} max-w-xs`}
        />
        <select
          value={type}
          onChange={(e) => { setType(e.target.value); setPage(1); }}
          className={control.input}
          style={{ width: "auto" }}
          aria-label="Type filter"
        >
          {TYPE_FILTERS.map((f) => <option key={f.value} value={f.value}>Type: {f.label}</option>)}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className={control.input}
          style={{ width: "auto" }}
          aria-label="Sort"
        >
          {SORTS.map((s) => <option key={s.value} value={s.value}>Sort: {s.label}</option>)}
        </select>
      </div>

      {error && <p className={`${text.body} mb-2 shrink-0`} style={{ color: theme.dangerColor }}>{error}</p>}

      {selected.size > 0 && (
        <div
          className={`flex items-center gap-3 mb-2 shrink-0 rounded-md border ${adminUi.pad.panel}`}
          style={{ borderColor: theme.borderColor, backgroundColor: theme.cardBackground }}
        >
          <span className={text.body}>{selected.size} selected</span>
          {closableSelected.length > 0 && (
            <button type="button" onClick={handleBulkClose} className={control.btnLink} style={{ color: theme.dangerColor }}>
              Close selected ({closableSelected.length})
            </button>
          )}
          <button type="button" onClick={() => setSelected(new Set())} className={control.btnLink} style={{ color: theme.mutedColor }}>
            Clear selection
          </button>
        </div>
      )}

      {/* ---- scrollable table region ---- */}
      <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border" style={{ borderColor: theme.borderColor }}>
        <table className={table.root}>
          <thead className="sticky top-0 z-10" style={{ backgroundColor: theme.sidebarBackground }}>
            <tr className={table.head}>
              <th className={table.th}>
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} className={control.checkbox} aria-label="Select all" />
              </th>
              <th className={table.th}>S.No</th>
              <th className={table.th}>Title</th>
              <th className={table.th}>Type</th>
              <th className={table.th}>Payment</th>
              <th className={table.th}>Booking</th>
              <th className={table.th}>Start</th>
              <th className={table.th}>End</th>
              <th className={table.th}>Booking Closes</th>
              <th className={table.th}>Status</th>
              <th className={table.th}>Created By</th>
              <th className={table.th}>Updated</th>
              <th className={table.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={13} className={`${table.td} text-center opacity-60`}>Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={13} className={`${table.td} text-center opacity-60`}>
                  {search ? "No experiences match your search." : type !== "all" ? "No experiences match the selected type." : EMPTY_MESSAGE[tab]}
                </td>
              </tr>
            ) : (
              items.map((row, i) => (
                <ExperienceRow
                  key={row.id}
                  row={row}
                  serial={(page - 1) * pageSize + i + 1}
                  selected={selected.has(row.id)}
                  onToggle={() => toggleRow(row.id)}
                  isAdmin={isAdmin}
                  userId={user?.id}
                  busy={rowBusyId === row.id}
                  onView={() => navigate(`/admin/experiences/${row.id}/edit`)}
                  onSubmit={() => runRowAction(row.id, () => adminApi.submitExperience(token, row.id), "Failed to submit for approval.")}
                  onApprove={() => runRowAction(row.id, () => adminApi.approveExperience(token, row.id), "Failed to approve experience.")}
                  onRequestChanges={() => setChangesTarget(row)}
                  onSetPayment={() => setPaymentTarget(row)}
                  onPublish={() => runRowAction(row.id, () => adminApi.publishExperience(token, row.id), "Failed to publish experience.")}
                  onClose={() => runRowAction(row.id, () => adminApi.closeExperience(token, row.id), "Failed to close experience.")}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ---- fixed footer ---- */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 shrink-0">
        <span className={`${text.body} opacity-60`}>
          {totalCount === 0 ? "Showing 0 of 0 experiences" : `Showing ${rangeStart}–${rangeEnd} of ${totalCount} experiences`}
        </span>
        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className={control.inputSm}
            aria-label="Rows per page"
          >
            {[10, 25, 50].map((n) => <option key={n} value={n}>{n} / page</option>)}
          </select>
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={control.btnGhost} style={{ borderColor: theme.borderColor, color: theme.textColor }}>
            Previous
          </button>
          <span className={text.body}>Page {page} of {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className={control.btnGhost} style={{ borderColor: theme.borderColor, color: theme.textColor }}>
            Next
          </button>
        </div>
      </div>

      {showCreate && <CreateExperienceModal onClose={() => setShowCreate(false)} />}
      {paymentTarget && (
        <SetPaymentModal
          row={paymentTarget}
          token={token}
          onClose={() => setPaymentTarget(null)}
          onSaved={async () => { setPaymentTarget(null); await load(); }}
        />
      )}
      {changesTarget && (
        <RequestChangesModal
          row={changesTarget}
          token={token}
          onClose={() => setChangesTarget(null)}
          onSaved={async () => { setChangesTarget(null); await load(); }}
        />
      )}
    </div>
  );
}

function ExperienceRow({
  row, serial, selected, onToggle, isAdmin, userId, busy,
  onView, onSubmit, onApprove, onRequestChanges, onSetPayment, onPublish, onClose,
}) {
  const { theme } = adminConfig;
  const { control, table } = adminUi;
  const badge = STATUS_BADGE[row.status] || { label: row.status, bg: "rgba(244,241,234,0.1)", fg: theme.textColor };
  const isOwner = row.createdByUserId === userId;

  const actions = [];
  actions.push({ key: "view", label: "View", onClick: onView });

  if (row.status === "Draft" || row.status === "ChangesRequested") {
    if (isAdmin || isOwner) actions.push({ key: "edit", label: "Edit", onClick: onView });
    if (isAdmin || isOwner) actions.push({ key: "submit", label: row.status === "ChangesRequested" ? "Resubmit" : "Submit", onClick: onSubmit });
  }
  if (row.status === "AwaitingApproval" && isAdmin) {
    actions.push({ key: "edit", label: "Edit", onClick: onView });
    actions.push({ key: "approve", label: "Approve", onClick: onApprove });
    actions.push({ key: "requestChanges", label: "Request Changes", onClick: onRequestChanges });
  }
  if (row.status === "Approved" && isAdmin) {
    actions.push({ key: "setPayment", label: "Set Payment", onClick: onSetPayment });
    actions.push({ key: "publish", label: "Publish", onClick: onPublish });
  }
  if (row.status === "Published" && isAdmin) {
    actions.push({ key: "close", label: "Close", onClick: onClose });
  }

  return (
    <tr className="border-t" style={{ borderColor: theme.borderColor }}>
      <td className={table.td}><input type="checkbox" checked={selected} onChange={onToggle} className={control.checkbox} /></td>
      <td className={table.td}>{serial}</td>
      <td className={table.td}>{row.title}</td>
      <td className={table.td}>
        <span className={control.pill} style={{ backgroundColor: "rgba(193,157,96,0.15)", color: theme.accentColor }}>
          {row.type?.toUpperCase()}
        </span>
      </td>
      <td className={table.td}>{row.requiresPayment ? `${row.currency} ${row.price}` : <span className="opacity-50">Free</span>}</td>
      <td className={table.td}>{formatBooking(row)}</td>
      <td className={table.td}>{formatDate(row.startDate)}</td>
      <td className={table.td}>{formatDate(row.endDate)}</td>
      <td className={table.td}>{formatDate(row.bookingEndDate)}</td>
      <td className={table.td}>
        <span className={control.pill} style={{ backgroundColor: badge.bg, color: badge.fg }}>{badge.label}</span>
      </td>
      <td className={table.td}>{row.createdByName}</td>
      <td className={table.td}>{formatDate(row.updatedAt, true)}</td>
      <td className={table.td}>
        <div className="flex items-center gap-2 flex-wrap">
          {actions.map((a) => (
            <button
              key={a.key}
              type="button"
              disabled={busy}
              onClick={a.onClick}
              className={control.btnLink}
              style={{ color: a.key === "requestChanges" || a.key === "close" ? theme.dangerColor : theme.accentColor }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </td>
    </tr>
  );
}

function formatDate(value, withTime = false) {
  if (!value) return <span className="opacity-40">—</span>;
  const d = new Date(value);
  return withTime
    ? d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function formatBooking(row) {
  if (!row.bookingEnabled) return <span className="opacity-50">Closed</span>;
  return `${row.bookingConfirmed} / ${row.capacityTotal ?? "Unlimited"}`;
}

/** Admin-only: price/currency/capacity/linked registration form. */
function SetPaymentModal({ row, token, onClose, onSaved }) {
  const { theme } = adminConfig;
  const { text, control } = adminUi;

  const [requiresPayment, setRequiresPayment] = useState(row.requiresPayment);
  const [price, setPrice] = useState(row.price || "");
  const [currency, setCurrency] = useState(row.currency || "INR");
  const [capacityTotal, setCapacityTotal] = useState(row.capacityTotal ?? "");
  const [forms, setForms] = useState([]);
  const [linkedFormTemplateId, setLinkedFormTemplateId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi.listForms(token).then(setForms).catch(() => {});
  }, [token]);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await adminApi.setExperiencePayment(token, row.id, {
        requiresPayment,
        price: requiresPayment ? Number(price) || 0 : 0,
        currency,
        capacityTotal: capacityTotal === "" ? null : Number(capacityTotal),
        linkedFormTemplateId: linkedFormTemplateId || null,
      });
      await onSaved();
    } catch (err) {
      setError(err.message || "Could not save payment settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-lg border p-4" style={{ backgroundColor: theme.cardBackground, borderColor: theme.borderColor }}>
        <h2 className={`${text.subheader} mb-3`}>Set payment — {row.title}</h2>

        <label className="flex items-center gap-1.5 cursor-pointer mb-2">
          <input type="checkbox" checked={requiresPayment} onChange={(e) => setRequiresPayment(e.target.checked)} className={control.checkbox} />
          <span className={text.micro}>Requires payment</span>
        </label>

        {requiresPayment && (
          <div className="flex items-center gap-1.5 mb-2">
            <input value={currency} onChange={(e) => setCurrency(e.target.value)} className={`${control.inputSm} w-16`} />
            <input type="number" min="1" step="0.01" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} className={control.inputSm} />
          </div>
        )}

        <label className={control.label}>Capacity (blank = unlimited)</label>
        <input type="number" min="0" value={capacityTotal} onChange={(e) => setCapacityTotal(e.target.value)} className={`${control.input} mb-2`} />

        <label className={control.label}>Registration form</label>
        <select value={linkedFormTemplateId} onChange={(e) => setLinkedFormTemplateId(e.target.value)} className={`${control.input} mb-2`}>
          <option value="">— Select a form —</option>
          {forms.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
        </select>

        {error && <p className={`${text.body} mb-2`} style={{ color: theme.dangerColor }}>{error}</p>}

        <div className="flex gap-2 mt-2">
          <button type="button" onClick={save} disabled={saving} className={control.btnPrimary} style={{ backgroundColor: theme.accentColor, color: theme.pageBackground }}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={onClose} className={control.btnGhost} style={{ borderColor: theme.borderColor, color: theme.textColor }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/** Admin-only: send an AwaitingApproval experience back with a reason. */
function RequestChangesModal({ row, token, onClose, onSaved }) {
  const { theme } = adminConfig;
  const { text, control } = adminUi;
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    if (!reason.trim()) {
      setError("A reason is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await adminApi.requestExperienceChanges(token, row.id, reason.trim());
      await onSaved();
    } catch (err) {
      setError(err.message || "Could not send back for changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-lg border p-4" style={{ backgroundColor: theme.cardBackground, borderColor: theme.borderColor }}>
        <h2 className={`${text.subheader} mb-2`}>Request changes — {row.title}</h2>
        <textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="What needs to change?" className={`${control.input} mb-2`} />
        {error && <p className={`${text.body} mb-2`} style={{ color: theme.dangerColor }}>{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={save} disabled={saving} className={control.btnPrimary} style={{ backgroundColor: theme.accentColor, color: theme.pageBackground }}>
            {saving ? "Sending…" : "Send back"}
          </button>
          <button type="button" onClick={onClose} className={control.btnGhost} style={{ borderColor: theme.borderColor, color: theme.textColor }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
