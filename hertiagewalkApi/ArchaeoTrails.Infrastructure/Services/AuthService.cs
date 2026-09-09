using System;
using System.Linq;
using System.Threading.Tasks;
using ArchaeoTrails.Application.Features.Auth;
using ArchaeoTrails.Application.Interfaces;
using ArchaeoTrails.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;

namespace ArchaeoTrails.Infrastructure.Services
{
    public class AuthService : IAuthService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IJwtTokenService _jwtTokenService;

        public AuthService(UserManager<ApplicationUser> userManager, IJwtTokenService jwtTokenService)
        {
            _userManager = userManager;
            _jwtTokenService = jwtTokenService;
        }

        public async Task<LoginResponse> LoginAsync(LoginRequest request)
        {
            var genericFailure = new LoginResponse { Success = false, Message = "Invalid email or password." };

            if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return genericFailure;
            }

            var user = await _userManager.FindByEmailAsync(request.Email);
            // Same message whether the account doesn't exist or the password is
            // wrong — never let login responses leak which accounts exist.
            if (user is null || !user.IsActive)
            {
                return genericFailure;
            }

            var passwordValid = await _userManager.CheckPasswordAsync(user, request.Password);
            if (!passwordValid)
            {
                return genericFailure;
            }

            var roles = await _userManager.GetRolesAsync(user);
            var (token, expiresAtUtc) = _jwtTokenService.CreateToken(user.Id, user.Email!, roles);

            return new LoginResponse
            {
                Success = true,
                Token = token,
                ExpiresAtUtc = expiresAtUtc,
                User = ToDto(user, roles.FirstOrDefault() ?? string.Empty)
            };
        }

        public async Task<UserDto?> GetByIdAsync(Guid userId)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user is null) return null;

            var roles = await _userManager.GetRolesAsync(user);
            return ToDto(user, roles.FirstOrDefault() ?? string.Empty);
        }

        private static UserDto ToDto(ApplicationUser user, string role) => new()
        {
            Id = user.Id,
            Email = user.Email ?? string.Empty,
            FullName = user.FullName,
            Role = role,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        };
    }
}
