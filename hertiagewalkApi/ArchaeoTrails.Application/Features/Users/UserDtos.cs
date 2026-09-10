using System.Collections.Generic;

namespace ArchaeoTrails.Application.Features.Users
{
    /// <summary>
    /// Admin-only: creates a staff (Admin/Employee) or reserved (User) account.
    /// There is no public self-registration endpoint — accounts are provisioned
    /// by an existing Admin.
    ///
    /// <see cref="UserName"/> is entered manually by the Admin and is separate
    /// from <see cref="Email"/> — it is the handle the account logs in with.
    /// </summary>
    public class CreateUserRequest
    {
        public string UserName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;

        /// <summary>Must be one of ArchaeoTrails.Domain.Constants.Roles.All.</summary>
        public string Role { get; set; } = string.Empty;
    }

    /// <summary>
    /// Admin-only: change an existing account's username and/or password.
    /// Both fields are optional — send only the one(s) being changed. This is
    /// an administrative reset, so the account's current password is not
    /// required; the endpoint is Admin-gated instead.
    /// </summary>
    public class UpdateUserCredentialsRequest
    {
        /// <summary>New username, or null/blank to leave it unchanged.</summary>
        public string? UserName { get; set; }

        /// <summary>New password, or null/blank to leave it unchanged.</summary>
        public string? NewPassword { get; set; }
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
