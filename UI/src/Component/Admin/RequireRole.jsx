// src/Component/Admin/RequireRole.jsx
//
// Route guard for /admin/*. Blocks three ways:
//   - not logged in            -> redirect to /admin/login
//   - logged in but wrong role -> "Access denied" (never a silent redirect
//                                  that could look like the page loaded)
// The "User" role (reserved for the future student portal) is never included
// in any `roles` list an admin route passes here, so a student account can
// authenticate against the API but still can't see anything under /admin.

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAdminAuth } from "./AuthContext";
import { adminConfig } from "../Config/admin.config";
import { adminUi } from "../Config/adminUi.config";

export default function RequireRole({ roles }) {
  const { user, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${adminUi.text.body}`}
        style={{ background: adminConfig.theme.pageBackground, color: adminConfig.theme.textColor }}
      >
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-1 text-center px-4"
        style={{ background: adminConfig.theme.pageBackground, color: adminConfig.theme.textColor }}
      >
        <h1 className={adminUi.text.header}>Access denied</h1>
        <p className={`${adminUi.text.body} opacity-70`}>
          Your account ({user.role}) doesn't have permission to view this page.
        </p>
      </div>
    );
  }

  return <Outlet />;
}
