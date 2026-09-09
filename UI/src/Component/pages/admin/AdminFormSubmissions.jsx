import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAdminAuth } from "../../Admin/AuthContext";
import { adminApi } from "../../Admin/adminApi";
import { adminConfig } from "../../Config/admin.config";

export default function AdminFormSubmissions() {
  const { id } = useParams();
  const { token } = useAdminAuth();
  const { theme } = adminConfig;

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminApi.listSubmissions(token, id);
        if (!cancelled) setSubmissions(data);
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load submissions.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, id]);

  return (
    <div>
      <Link to="/admin/forms" className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.accentColor }}>
        ← Back to forms
      </Link>
      <h1 className="text-3xl font-bold mt-3 mb-6">Submissions</h1>

      {error && <p className="mb-4" style={{ color: theme.dangerColor }}>{error}</p>}

      {loading ? (
        <p className="opacity-60">Loading…</p>
      ) : submissions.length === 0 ? (
        <p className="opacity-60">No submissions yet.</p>
      ) : (
        <div className="space-y-4">
          {submissions.map((s) => (
            <div
              key={s.id}
              className="p-5 rounded-2xl border"
              style={{ backgroundColor: theme.cardBackground, borderColor: theme.borderColor }}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-bold">{s.submitterName || "—"}</p>
                  <p className="text-sm opacity-60">{s.submitterEmail || "—"}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{s.amountPaid} {s.currency}</p>
                  <p
                    className="text-xs uppercase tracking-wider"
                    style={{ color: s.status === "Paid" ? theme.successColor : theme.dangerColor }}
                  >
                    {s.status}
                  </p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(s.formData).map(([key, value]) => (
                  <div key={key}>
                    <dt className="opacity-50 text-xs uppercase tracking-wider">{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-xs opacity-40 mt-3">{new Date(s.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
