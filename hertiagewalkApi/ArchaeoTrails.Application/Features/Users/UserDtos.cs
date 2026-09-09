using System.Collections.Generic;

namespace ArchaeoTrails.Application.Features.Users
{
    /// <summary>
    /// Admin-only: creates a staff (Admin/Employee) or reserved (User) account.
    /// There is no public self-registration endpoint — accounts are provisioned
    /// by an existing Admin.
    /// </summary>
    public class CreateUserRequest
    {
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;

        /// <summary>Must be one of ArchaeoTrails.Domain.Constants.Roles.All.</summary>
        public string Role { get; set; } = string.Empty;
    }

    public class UpdateUserRoleRequest
    {
        public string Role { get; set; } = string.Empty;
    }

    public class UpdateUserStatusRequest
    {
        public bool IsActive { get; set; }
    }

    public class UserOperationResult
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public IEnumerable<string>? Errors { get; set; }
    }
}
