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

  // Submissions page — status filter cards. `value` must match the API's
  // SubmissionStatus enum names (Domain/Enums/SubmissionStatus.cs); "All" is
  // the no-filter card.
  submissions: {
    title: "Submissions",
    searchPlaceholder: "Search name, email, phone or ID…",
    allRegistrationTypes: "All registration types",
    emptyFiltered: "No submissions match these filters.",
    detailTitle: "Submission details",
    // Order-by dropdown. `field` is read off the submission DTO.
    sortOptions: [
      { value: "newest", label: "Newest first", field: "createdAt", dir: "desc" },
      { value: "oldest", label: "Oldest first", field: "createdAt", dir: "asc" },
      { value: "amountDesc", label: "Amount: high to low", field: "amountPaid", dir: "desc" },
      { value: "amountAsc", label: "Amount: low to high", field: "amountPaid", dir: "asc" },
      { value: "nameAsc", label: "Name: A to Z", field: "submitterName", dir: "asc" },
      { value: "nameDesc", label: "Name: Z to A", field: "submitterName", dir: "desc" },
    ],
    statusFilters: [
      { value: "All", label: "All", color: "#F4F1EA" },
      { value: "PendingPayment", label: "Pending", color: "#E0B86C" },
      { value: "Paid", label: "Paid", color: "#6CC19D" },
      { value: "Expired", label: "Expired", color: "#E06C6C" },
      { value: "Failed", label: "Failed", color: "#C1606C" },
      { value: "Submitted", label: "Submitted", color: "#6C9DC1" },
    ],
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
