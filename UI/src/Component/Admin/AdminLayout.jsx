// src/Component/Admin/AdminLayout.jsx
//
// Sidebar shell for everything under /admin — intentionally its own layout,
// not the public site's Layout.jsx (different nav, no scroll-to-section
// logic, no footer needed).
//
// The sidebar is fixed to the viewport (never scrolls with the page) and
// collapsed to icon-only by default; a toggle expands it to icon+label. Only
// the nav list scrolls if it ever overflows — the profile/logout block at the
// bottom stays pinned.
//
// All type/spacing comes from adminUi (Config/adminUi.config.jsx) so the whole
// console shares one compact scale.

import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAdminAuth } from "./AuthContext";
import { adminConfig } from "../Config/admin.config";
import { adminUi } from "../Config/adminUi.config";

const COLLAPSED_WIDTH = 56;
const EXPANDED_WIDTH = 192;

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", end: true, icon: IconDashboard },
  { to: "/admin/experiences", label: "Experiences", icon: IconExperiences },
  { to: "/admin/forms", label: "Forms", icon: IconForms },
  { to: "/admin/users", label: "Users & Roles", icon: IconUsers, adminOnly: true },
];

export default function AdminLayout() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const { theme, roles } = adminConfig;
  const { text } = adminUi;

  const [expanded, setExpanded] = useState(false);
  const width = expanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH;

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen" style={{ background: theme.pageBackground, color: theme.textColor }}>
      <aside
        className="fixed inset-y-0 left-0 z-30 flex flex-col border-r transition-[width] duration-150"
        style={{ width, backgroundColor: theme.sidebarBackground, borderColor: theme.borderColor }}
      >
        {/* Collapse/expand toggle — replaces the old "Admin Panel" text header. */}
        <div
          className="flex items-center h-11 shrink-0 border-b px-2"
          style={{ borderColor: theme.borderColor, justifyContent: expanded ? "flex-end" : "center" }}
        >
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            title={expanded ? "Collapse sidebar" : "Expand sidebar"}
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            className="w-7 h-7 grid place-items-center rounded-md hover:bg-white/5 transition-colors shrink-0"
            style={{ color: theme.accentColor }}
          >
            <IconChevron expanded={expanded} />
          </button>
        </div>

        {/* Only this list scrolls, and only if it ever overflows the viewport. */}
        <nav className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-1.5 ${adminUi.stack.xs}`}>
          {NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === roles.ADMIN).map((item) => (
            <NavItem key={item.to} {...item} expanded={expanded} theme={theme} text={text} />
          ))}
        </nav>

        {/* Profile + logout: pinned to the bottom, never scrolls. */}
        <div
          className="shrink-0 border-t p-1.5 flex flex-col items-stretch gap-1.5"
          style={{ borderColor: theme.borderColor }}
        >
          <div
            className={`flex items-center gap-2 rounded-md py-1 ${expanded ? "px-1.5" : "px-0 justify-center"}`}
            title={!expanded ? `${user?.fullName || ""} — ${user?.role || ""}` : undefined}
          >
            <div
              className="w-6 h-6 shrink-0 rounded-full grid place-items-center text-[10px] font-bold"
              style={{ backgroundColor: "rgba(193,157,96,0.18)", color: theme.accentColor }}
            >
              {(user?.fullName || user?.userName || "?").slice(0, 1).toUpperCase()}
            </div>
            {expanded && (
              <div className={`${text.body} min-w-0 leading-tight`}>
                <p className="font-semibold truncate">{user?.fullName}</p>
                <p className={`${text.micro} font-normal truncate`} style={{ color: theme.accentColor }}>
                  {user?.role}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Log Out"
            aria-label="Log Out"
            className={`flex items-center gap-2 rounded-md border transition-opacity hover:opacity-80 ${
              expanded ? "px-2 py-1.5 justify-start" : "w-7 h-7 justify-center mx-auto"
            }`}
            style={{ borderColor: theme.accentColor, color: theme.accentColor }}
          >
            <IconLogout />
            {expanded && <span className={text.micro}>Log Out</span>}
          </button>
        </div>
      </aside>

      <main
        className={`${adminUi.pad.page} ${text.body} transition-[margin-left] duration-150`}
        style={{ marginLeft: width }}
      >
        <Outlet />
      </main>
    </div>
  );
}

function NavItem({ to, label, end, icon: Icon, expanded, theme, text }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={!expanded ? label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-md py-1.5 transition-colors ${expanded ? "px-2" : "px-0 justify-center"} ${
          isActive ? "opacity-100" : "opacity-60 hover:opacity-90"
        }`
      }
      style={({ isActive }) => ({
        backgroundColor: isActive ? "rgba(193,157,96,0.15)" : "transparent",
        color: theme.textColor,
      })}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {expanded && <span className={`${text.micro} truncate`}>{label}</span>}
    </NavLink>
  );
}

// Inline icon set — no icon dependency in the repo today, and these six glyphs
// don't justify adding one.
function IconChevron({ expanded }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 150ms" }}
    >
      <path d="M6 3l5 5-5 5" />
    </svg>
  );
}

function IconDashboard({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="6" height="7" rx="1" />
      <rect x="11" y="3" width="6" height="4" rx="1" />
      <rect x="11" y="9" width="6" height="8" rx="1" />
      <rect x="3" y="12" width="6" height="5" rx="1" />
    </svg>
  );
}

function IconExperiences({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 17.5s5.5-4.8 5.5-9a5.5 5.5 0 1 0-11 0c0 4.2 5.5 9 5.5 9Z" />
      <circle cx="10" cy="8.2" r="2.1" />
    </svg>
  );
}

function IconForms({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 2.5h7l3 3V16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z" />
      <path d="M12 2.5V6h3" />
      <path d="M6.5 10h7M6.5 12.7h7M6.5 15.3h4" />
    </svg>
  );
}

function IconUsers({ className }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="6.5" r="2.5" />
      <path d="M2.5 16c0-2.8 2-4.5 4.5-4.5s4.5 1.7 4.5 4.5" />
      <circle cx="14.5" cy="7" r="2" />
      <path d="M12.8 11.7c1.9.2 3.7 1.7 3.7 4.3" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 17H4.5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1H8" />
      <path d="M13 13.5 17 10l-4-3.5" />
      <path d="M17 10H7.5" />
    </svg>
  );
}
