import { useAdminAuth } from "../../Admin/AuthContext";
import { adminConfig } from "../../Config/admin.config";

export default function AdminDashboard() {
  const { user } = useAdminAuth();
  const { theme } = adminConfig;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Welcome, {user?.fullName}</h1>
      <p className="opacity-60 mb-8">
        Signed in as <span style={{ color: theme.accentColor }}>{user?.role}</span>.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        <div
          className="p-6 rounded-2xl border"
          style={{ backgroundColor: theme.cardBackground, borderColor: theme.borderColor }}
        >
          <h2 className="font-bold mb-2">Forms & Submissions</h2>
          <p className="text-sm opacity-60">
            Create shareable pay-to-submit forms and review paid submissions.
          </p>
        </div>

        {user?.role === adminConfig.roles.ADMIN && (
          <div
            className="p-6 rounded-2xl border"
            style={{ backgroundColor: theme.cardBackground, borderColor: theme.borderColor }}
          >
            <h2 className="font-bold mb-2">Users & Roles</h2>
            <p className="text-sm opacity-60">
              Create staff accounts and manage Admin/Employee roles.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
