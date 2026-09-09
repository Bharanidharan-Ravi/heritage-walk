// src/Component/Config/admin.config.jsx
//
// Copy/theme for the admin panel — kept separate from the public marketing
// site's config files (heroConfig, contact.config, ...) even though it shares
// the same dark-museum palette, per the section+config split convention in
// CLAUDE.md.

export const adminConfig = {
  theme: {
    sidebarBackground: "#0F161E",
    pageBackground: "#141C26",
    cardBackground: "#1A202C",
    textColor: "#F4F1EA",
    accentColor: "#C19D60",
    borderColor: "rgba(193, 157, 96, 0.2)",
    dangerColor: "#E06C6C",
    successColor: "#6CC19D",
  },

  content: {
    title: "Admin Panel",
    subtitle: "ArchaeoTrails staff area — not for student/user accounts.",
  },

  // Which roles may see each nav item / route. "User" is intentionally never
  // listed here — that role is reserved for the separate student-facing
  // portal and must never reach this panel.
  roles: {
    ADMIN: "Admin",
    EMPLOYEE: "Employee",
    USER: "User",
  },
};
