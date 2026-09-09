using System;
using Microsoft.AspNetCore.Identity;

namespace ArchaeoTrails.Infrastructure.Identity
{
    /// <summary>
    /// The concrete ASP.NET Core Identity user for the admin panel (Admin /
    /// Employee / User accounts — see ArchaeoTrails.Domain.Constants.Roles).
    /// Deliberately lives in Infrastructure, not Domain: Identity is a
    /// persistence/framework concern, and Domain stays dependency-free.
    /// Application/Api code should depend on UserDto + IAuthService /
    /// IUserManagementService, never on this type directly.
    /// </summary>
    public class ApplicationUser : IdentityUser<Guid>
    {
        public string FullName { get; set; } = string.Empty;

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
