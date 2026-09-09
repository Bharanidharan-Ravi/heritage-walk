namespace ArchaeoTrails.Domain.Constants
{
    /// <summary>
    /// The three roles the admin panel understands. Kept as plain strings (not
    /// tied to ASP.NET Identity) so the Domain project stays framework-free —
    /// see docs/admin-panel notes in CLAUDE.md.
    ///
    /// Admin       — full control: manage users/roles, forms, submissions.
    /// Employee    — day-to-day staff: manage forms/submissions, no user management.
    /// User        — reserved for the (future, separate) student-facing portal.
    ///               Must never be authorized onto any /api/users or admin-only
    ///               /api/forms route — see [Authorize(Roles = ...)] usages.
    /// </summary>
    public static class Roles
    {
        public const string Admin = "Admin";
        public const string Employee = "Employee";
        public const string User = "User";

        public static readonly string[] All = { Admin, Employee, User };

        /// <summary>Roles allowed to manage forms/submissions (not user accounts).</summary>
        public const string StaffPolicy = Admin + "," + Employee;
    }
}
