using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using ArchaeoTrails.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace ArchaeoTrails.Infrastructure.Services
{
    /// <summary>
    /// Issues HMAC-SHA256-signed JWTs for the admin panel. Reads signing
    /// config from Jwt:Issuer / Jwt:Audience / Jwt:Key / Jwt:ExpiryMinutes —
    /// see appsettings.json.
    ///
    /// TODO(admin-panel): Jwt:Key must be a real, random 32+ byte secret
    /// supplied via `dotnet user-secrets` (dev) or Azure App Service
    /// Configuration (prod) — never the placeholder committed in
    /// appsettings.json.
    /// </summary>
    public class JwtTokenService : IJwtTokenService
    {
        private readonly IConfiguration _configuration;

        public JwtTokenService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public (string Token, DateTime ExpiresAtUtc) CreateToken(Guid userId, string userName, string email, IEnumerable<string> roles)
        {
            var issuer = _configuration["Jwt:Issuer"] ?? "ArchaeoTrailsApi";
            var audience = _configuration["Jwt:Audience"] ?? "ArchaeoTrailsAdminPanel";
            var key = _configuration["Jwt:Key"]
                ?? throw new InvalidOperationException("Jwt:Key is not configured — set it via dotnet user-secrets or App Service configuration.");
            var expiryMinutes = int.TryParse(_configuration["Jwt:ExpiryMinutes"], out var m) ? m : 60;

            var claims = new List<Claim>
            {
                new(JwtRegisteredClaimNames.Sub, userId.ToString()),
                // Name = the login handle, which is now distinct from the email.
                new(JwtRegisteredClaimNames.UniqueName, userName),
                new(JwtRegisteredClaimNames.Email, email),
                new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            };
            foreach (var role in roles)
            {
                claims.Add(new Claim(ClaimTypes.Role, role));
            }

            var credentials = new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
                SecurityAlgorithms.HmacSha256);

            var expires = DateTime.UtcNow.AddMinutes(expiryMinutes);

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: expires,
                signingCredentials: credentials);

            return (new JwtSecurityTokenHandler().WriteToken(token), expires);
        }
    }
}
