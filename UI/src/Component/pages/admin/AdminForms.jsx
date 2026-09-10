// Admin/Employee: the list of existing forms. Creating one now happens in the
// dedicated builder at /admin/forms/new (AdminFormBuilder.jsx), which needs the
// full width of the page for its three panes.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAdminAuth } from "../../Admin/AuthContext";
import { adminApi } from "../../Admin/adminApi";
import { adminConfig } from "../../Config/admin.config";
import { adminUi } from "../../Config/adminUi.config";
import FormShare from "../../Sections/FormShare";

export default function AdminForms() {
  const { token } = useAdminAuth();
  const { theme } = adminConfig;
  const { text, control, table } = adminUi;

  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sharingSlug, setSharingSlug] = useState(null);

  const loadForms = async () => {
    setLoading(true);
    try {
      setForms(await adminApi.listForms(token));
      setError("");
    } catch (err) {
      setError(err.message || "Could not load forms.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleActive = async (id, isActive) => {
    try {
      await adminApi.updateFormStatus(token, id, !isActive);
      await loadForms();
    } catch (err) {
      setError(err.message || "Could not update form status.");
    }
  };

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h1 className={text.header}>Forms &amp; Submissions</h1>
        <Link
          to="/admin/forms/new"
          className={control.btnPrimary}
          style={{ backgroundColor: theme.accentColor, color: theme.sidebarBackground }}
        >
          + New form
        </Link>
      </header>

      {error && <p className={`${text.body} mb-2`} style={{ color: theme.dangerColor }}>{error}</p>}

      {loading ? (
        <p className={`${text.body} opacity-60`}>Loading…</p>
      ) : forms.length === 0 ? (
        <div
          className="rounded-lg border border-dashed px-4 py-5 text-center"
          style={{ borderColor: theme.borderColor }}
        >
          <p className={`${text.bodyHeader} mb-1`}>No forms yet</p>
          <p className={`${text.body} opacity-60 mb-3`}>
            Build one in the drag-and-drop builder, with or without a payment step.
          </p>
          <Link
            to="/admin/forms/new"
            className={control.btnPrimary}
            style={{ backgroundColor: theme.accentColor, color: theme.sidebarBackground }}
          >
            Create your first form
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className={table.root}>
            <thead>
              <tr className={table.head}>
                <th className={table.th}>Title</th>
                <th className={table.th}>Payment</th>
                <th className={table.th}>Status</th>
                <th className={table.th}>Submissions</th>
                <th className={table.th}></th>
              </tr>
            </thead>
            <tbody>
              {forms.map((f) => (
                <tr key={f.id} className="border-t" style={{ borderColor: theme.borderColor }}>
                  <td className={table.td}>{f.title}</td>
                  <td className={table.td}>
                    {f.requiresPayment ? `${f.price} ${f.currency}` : <span className="opacity-50">Free</span>}
                  </td>
                  <td className={table.td}>
                    <button
                      onClick={() => handleToggleActive(f.id, f.isActive)}
                      className={control.pill}
                      style={{
                        backgroundColor: f.isActive ? "rgba(108,193,157,0.15)" : "rgba(224,108,108,0.15)",
                        color: f.isActive ? theme.successColor : theme.dangerColor,
                      }}
                    >
                      {f.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className={table.td}>{f.submissionCount}</td>
                  <td className={table.td}>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSharingSlug(sharingSlug === f.slug ? null : f.slug)}
                        className={control.btnLink}
                        style={{ color: theme.accentColor }}
                      >
                        {sharingSlug === f.slug ? "Hide share" : "Share"}
                      </button>
                      <Link
                        to={`/admin/forms/${f.id}/submissions`}
                        className={control.btnLink}
                        style={{ color: theme.accentColor }}
                      >
                        View submissions
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sharingSlug && (
        <div className="mt-4">
          <FormShare slug={sharingSlug} compact />
        </div>
      )}
    </div>
  );
}
