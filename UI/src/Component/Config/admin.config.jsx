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

  // Copy for the login screen and the Users & Roles page. Usernames are an
  // Admin-entered login handle, deliberately separate from the account's
  // email — the hint below mirrors Domain.Constants.UserNameRules on the API,
  // so keep the two in sync if the rule changes.
  auth: {
    loginTitle: "Admin Login",
    loginSubtitle: "Staff access only.",
    userNameLabel: "Username",
    passwordLabel: "Password",
    invalidCredentials: "Invalid username or password.",
  },

  users: {
    title: "Users & Roles",
    createHeading: "Create account",
    userNameHint: "3–32 characters — letters, digits, dot, underscore or hyphen.",
    userNamePattern: "^[A-Za-z0-9._-]{3,32}$",
    passwordMinLength: 8,
    credentialsHeading: "Change username / password",
    credentialsHint: "Leave a field blank to keep it unchanged.",
  },
};
