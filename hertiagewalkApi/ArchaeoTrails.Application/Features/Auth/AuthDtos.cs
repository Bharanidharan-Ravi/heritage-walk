using System;

namespace ArchaeoTrails.Application.Features.Auth
{
    /// <summary>
    /// Admin-panel login. The account's <see cref="UserName"/> is a real,
    /// admin-chosen handle — it is no longer the email address, so this field
    /// is what the login form sends. Email is still accepted here as a
    /// fallback identifier so accounts created before usernames existed (and
    /// the seeded Admin) can still sign in.
    /// </summary>
    public class LoginRequest
    {
        /// <summary>Username, or (fallback) the account's email address.</summary>
        public string UserName { get; set; } = string.Empty;

        public string Password { get; set; } = string.Empty;
    }

    public class UserDto
    {
        public Guid Id { get; set; }

        /// <summary>Login handle — independent of <see cref="Email"/>.</summary>
        public string UserName { get; set; } = string.Empty;

        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class LoginResponse
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public string? Token { get; set; }
        public DateTime? ExpiresAtUtc { get; set; }
        public UserDto? User { get; set; }
    }
}
