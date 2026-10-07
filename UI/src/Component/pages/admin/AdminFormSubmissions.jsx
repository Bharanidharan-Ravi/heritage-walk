import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useAdminAuth } from "../../Admin/AuthContext";
import { adminApi } from "../../Admin/adminApi";
import { adminConfig } from "../../Config/admin.config";
import { adminUi } from "../../Config/adminUi.config";
import { qk } from "../../../queryKeys";

// formData keys are whatever the form builder saved, so look the
// registration type up case-insensitively.
const getRegistrationType = (formData = {}) => {
  const key = Object.keys(formData).find((k) => k.toLowerCase() === "registrationtype");
  return key ? formData[key] : "";
};

const shortId = (id = "") => String(id).slice(0, 8).toUpperCase();

export default function AdminFormSubmissions() {
  const { id } = useParams();
  const { token } = useAdminAuth();
  const { theme, submissions: copy } = adminConfig;
  const { text, control, pad } = adminUi;

  const [statusFilter, setStatusFilter] = useState("All");
  const [regTypeFilter, setRegTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState(copy.sortOptions[0].value);
  const [selected, setSelected] = useState(null);

  const {
    data: submissions = [],
    isLoading: loading,
    error: queryError,
  } = useQuery({
    queryKey: qk.formSubmissions(id),
    queryFn: () => adminApi.listSubmissions(token, id),
    staleTime: Infinity,
    enabled: !!token && !!id,
  });
  const error = queryError?.message || (queryError ? "Could not load submissions." : "");

  const statusMeta = (status) =>
    copy.statusFilters.find((f) => f.value === status) || { label: status, color: theme.textColor };

  const counts = useMemo(() => {
    const c = { All: submissions.length };
    for (const s of submissions) c[s.status] = (c[s.status] || 0) + 1;
    return c;
  }, [submissions]);

  const registrationTypes = useMemo(
    () => [...new Set(submissions.map((s) => getRegistrationType(s.formData)).filter(Boolean))].sort(),
    [submissions]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = submissions.filter((s) => {
      if (statusFilter !== "All" && s.status !== statusFilter) return false;
      if (regTypeFilter && getRegistrationType(s.formData) !== regTypeFilter) return false;
      if (!term) return true;
      const haystack = [s.id, s.submitterName, s.submitterEmail, ...Object.values(s.formData || {})]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });

    const { field, dir } = copy.sortOptions.find((o) => o.value === sortBy) || copy.sortOptions[0];
    const sign = dir === "asc" ? 1 : -1;
    return rows.sort((a, b) => {
      if (field === "createdAt") return sign * (new Date(a.createdAt) - new Date(b.createdAt));
      if (field === "amountPaid") return sign * (Number(a.amountPaid) - Number(b.amountPaid));
      return sign * String(a[field] || "").localeCompare(String(b[field] || ""), undefined, { sensitivity: "base" });
    });
  }, [submissions, statusFilter, regTypeFilter, search, sortBy, copy.sortOptions]);

  return (
    <div>
      <Link to="/admin/forms" className={control.btnLink} style={{ color: theme.accentColor }}>
        ← Back to forms
      </Link>
      <h1 className={`${text.header} mt-1.5 mb-3`}>{copy.title}</h1>

      {error && <p className={`${text.body} mb-2`} style={{ color: theme.dangerColor }}>{error}</p>}

      {/* Status filter cards */}
      <div className={`grid grid-cols-3 sm:grid-cols-6 ${adminUi.gap.sm} mb-3`}>
        {copy.statusFilters.map((f) => {
          const active = statusFilter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={`${pad.panel} ${adminUi.radius.card} border text-left transition-colors`}
              style={{
                backgroundColor: active ? "rgba(193,157,96,0.12)" : theme.cardBackground,
                borderColor: active ? f.color : theme.borderColor,
              }}
            >
              <p className={text.micro} style={{ color: f.color }}>{f.label}</p>
              <p className={text.subheader}>{counts[f.value] || 0}</p>
            </button>
          );
        })}
      </div>

      {/* Secondary filters */}
      <div className={`flex flex-col sm:flex-row ${adminUi.gap.sm} mb-3`}>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={copy.searchPlaceholder}
          className={control.input}
        />
        <select
          value={regTypeFilter}
          onChange={(e) => setRegTypeFilter(e.target.value)}
          className={`${control.input} sm:w-56`}
          style={{ backgroundColor: theme.cardBackground }}
        >
          <option value="">{copy.allRegistrationTypes}</option>
          {registrationTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className={`${control.input} sm:w-48`}
          style={{ backgroundColor: theme.cardBackground }}
          aria-label="Order by"
        >
          {copy.sortOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className={`${text.body} opacity-60`}>Loading…</p>
      ) : submissions.length === 0 ? (
        <p className={`${text.body} opacity-60`}>No submissions yet.</p>
      ) : filtered.length === 0 ? (
        <p className={`${text.body} opacity-60`}>{copy.emptyFiltered}</p>
      ) : (
        <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 ${adminUi.gap.sm}`}>
          {filtered.map((s) => {
            const meta = statusMeta(s.status);
            const regType = getRegistrationType(s.formData);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelected(s)}
                className={`${pad.card} ${adminUi.radius.card} border text-left hover:brightness-110 transition`}
                style={{ backgroundColor: theme.cardBackground, borderColor: theme.borderColor }}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`${text.micro} opacity-50`} title={s.id}>#{shortId(s.id)}</span>
                  <span
                    className={control.pill}
                    style={{ color: meta.color, backgroundColor: `${meta.color}1A` }}
                  >
                    {meta.label}
                  </span>
                </div>
                <p className={`${text.bodyHeader} truncate`}>{s.submitterName || "—"}</p>
                <div className="flex justify-between items-center mt-1">
                  <span className={`${text.body} opacity-60`}>{regType || "—"}</span>
                  <span className={text.bodyHeader}>
                    {s.amountPaid} {s.currency}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <SubmissionDetailModal
          submission={selected}
          meta={statusMeta(selected.status)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function SubmissionDetailModal({ submission: s, meta, onClose }) {
  const { theme, submissions: copy } = adminConfig;
  const { text, control, pad } = adminUi;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className={`${pad.card} ${adminUi.radius.card} border w-full max-w-2xl max-h-[85vh] overflow-y-auto`}
        style={{ backgroundColor: theme.cardBackground, borderColor: theme.borderColor, color: theme.textColor }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className={`${text.micro} opacity-50`}>{copy.detailTitle} · #{shortId(s.id)}</p>
            <p className={text.subheader}>{s.submitterName || "—"}</p>
            <p className={`${text.body} opacity-60`}>{s.submitterEmail || "—"}</p>
          </div>
          <div className="text-right">
            <p className={text.bodyHeader}>{s.amountPaid} {s.currency}</p>
            <span className={control.pill} style={{ color: meta.color, backgroundColor: `${meta.color}1A` }}>
              {meta.label}
            </span>
          </div>
        </div>

        <dl className={`grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 ${text.body}`}>
          {Object.entries(s.formData || {}).map(([key, value]) => (
            <div key={key}>
              <dt className={`${text.micro} opacity-50`}>{key}</dt>
              <dd className="wrap-break-word">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex justify-between items-center mt-3">
          <p className={`${text.micro} tracking-normal normal-case opacity-40`} title={s.id}>
            {new Date(s.createdAt).toLocaleString()} · {s.id}
          </p>
          <button
            type="button"
            onClick={onClose}
            className={control.btnGhost}
            style={{ borderColor: theme.borderColor, color: theme.accentColor }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
