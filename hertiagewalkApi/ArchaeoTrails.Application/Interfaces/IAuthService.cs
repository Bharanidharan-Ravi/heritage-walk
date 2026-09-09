using System.Threading.Tasks;
using ArchaeoTrails.Application.Features.Auth;

namespace ArchaeoTrails.Application.Interfaces
{
    public interface IAuthService
    {
        /// <summary>
        /// Validates credentials against the admin-panel account store and,
        /// if the account is active and the password matches, issues a JWT.
        /// Never distinguishes "wrong password" from "no such account" in the
        /// response message — avoids user-enumeration.
        /// </summary>
        Task<LoginResponse> LoginAsync(LoginRequest request);

        Task<UserDto?> GetByIdAsync(System.Guid userId);
    }
}
