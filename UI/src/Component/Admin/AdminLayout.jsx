// src/Component/Admin/AdminLayout.jsx
//
// Sidebar shell for everything under /admin — intentionally its own layout,
// not the public site's Layout.jsx (different nav, no scroll-to-section
// logic, no footer needed).

import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAdminAuth } from "./AuthContext";
import { adminConfig } from "../Config/admin.config";

export default function AdminLayout() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const { theme, content, roles } = adminConfig;

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  const navItem = (to, label) => (
    <NavLink
      to={to}
      end={to === "/admin"}
      className={({ isActive }) =>
        `block px-4 py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors ${
          isActive ? "opacity-100" : "opacity-60 hover:opacity-90"
        }`
      }
      style={({ isActive }) => ({
        backgroundColor: isActive ? "rgba(193,157,96,0.15)" : "transparent",
        color: theme.textColor,
      })}
    >
      {label}
    </NavLink>
  );

  return (
    <div className="min-h-screen flex" style={{ background: theme.pageBackground, color: theme.textColor }}>
      <aside
        className="w-64 shrink-0 flex flex-col border-r"
        style={{ backgroundColor: theme.sidebarBackground, borderColor: theme.borderColor }}
      >
        <div className="p-6 border-b" style={{ borderColor: theme.borderColor }}>
          <h1 className="text-lg font-bold" style={{ color: theme.accentColor }}>
            {content.title}
          </h1>
          <p className="text-xs opacity-50 mt-1">{content.subtitle}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItem("/admin", "Dashboard")}
          {navItem("/admin/forms", "Forms & Submissions")}
          {user?.role === roles.ADMIN && navItem("/admin/users", "Users & Roles")}
        </nav>

        <div className="p-4 border-t space-y-2" style={{ borderColor: theme.borderColor }}>
          <div className="text-xs opacity-70">
            <p className="font-bold">{user?.fullName}</p>
            <p>{user?.email}</p>
            <p className="uppercase tracking-widest mt-1" style={{ color: theme.accentColor }}>
              {user?.role}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2 rounded-lg text-xs font-bold uppercase tracking-widest border"
            style={{ borderColor: theme.accentColor, color: theme.accentColor }}
          >
            Log Out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
