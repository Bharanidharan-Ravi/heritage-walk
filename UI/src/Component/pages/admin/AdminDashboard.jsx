import { useAdminAuth } from "../../Admin/AuthContext";
import { adminConfig } from "../../Config/admin.config";
import { adminUi } from "../../Config/adminUi.config";

export default function AdminDashboard() {
  const { user } = useAdminAuth();
  const { theme } = adminConfig;
  const { text, pad } = adminUi;

  return (
    <div>
      <h1 className={`${text.header} mb-1`}>Welcome, {user?.fullName}</h1>
      <p className={`${text.bodySub} opacity-60 mb-4`}>
        Signed in as <span style={{ color: theme.accentColor }}>{user?.role}</span>.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
        <div
          className={`${pad.card} rounded-lg border`}
          style={{ backgroundColor: theme.cardBackground, borderColor: theme.borderColor }}
        >
          <h2 className={`${text.bodyHeader} mb-1`}>Forms &amp; Submissions</h2>
          <p className={`${text.body} opacity-60`}>
            Create shareable pay-to-submit forms and review paid submissions.
          </p>
        </div>

        {user?.role === adminConfig.roles.ADMIN && (
          <div
            className={`${pad.card} rounded-lg border`}
            style={{ backgroundColor: theme.cardBackground, borderColor: theme.borderColor }}
          >
            <h2 className={`${text.bodyHeader} mb-1`}>Users &amp; Roles</h2>
            <p className={`${text.body} opacity-60`}>
              Create staff accounts and manage Admin/Employee roles.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
