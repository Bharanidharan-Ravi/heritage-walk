import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useAdminAuth } from "../../Admin/AuthContext";
import { adminApi } from "../../Admin/adminApi";
import { adminConfig } from "../../Config/admin.config";
import { adminUi } from "../../Config/adminUi.config";
import { qk } from "../../../queryKeys";

export default function AdminFormSubmissions() {
  const { id } = useParams();
  const { token } = useAdminAuth();
  const { theme } = adminConfig;
  const { text, control, pad } = adminUi;

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

  return (
    <div>
      <Link to="/admin/forms" className={control.btnLink} style={{ color: theme.accentColor }}>
        ← Back to forms
      </Link>
      <h1 className={`${text.header} mt-1.5 mb-3`}>Submissions</h1>

      {error && <p className={`${text.body} mb-2`} style={{ color: theme.dangerColor }}>{error}</p>}

      {loading ? (
        <p className={`${text.body} opacity-60`}>Loading…</p>
      ) : submissions.length === 0 ? (
        <p className={`${text.body} opacity-60`}>No submissions yet.</p>
      ) : (
        <div className={adminUi.stack.sm}>
          {submissions.map((s) => (
            <div
              key={s.id}
              className={`${pad.card} rounded-lg border`}
              style={{ backgroundColor: theme.cardBackground, borderColor: theme.borderColor }}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className={text.bodyHeader}>{s.submitterName || "—"}</p>
                  <p className={`${text.body} opacity-60`}>{s.submitterEmail || "—"}</p>
                </div>
                <div className="text-right">
                  <p className={text.bodyHeader}>{s.amountPaid} {s.currency}</p>
                  <p
                    className={text.micro}
                    style={{ color: s.status === "Paid" ? theme.successColor : theme.dangerColor }}
                  >
                    {s.status}
                  </p>
                </div>
              </div>
              <dl className={`grid grid-cols-2 gap-x-3 gap-y-1.5 ${text.body}`}>
                {Object.entries(s.formData).map(([key, value]) => (
                  <div key={key}>
                    <dt className={`${text.micro} opacity-50`}>{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <p className={`${text.micro} tracking-normal normal-case opacity-40 mt-2`}>
                {new Date(s.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
