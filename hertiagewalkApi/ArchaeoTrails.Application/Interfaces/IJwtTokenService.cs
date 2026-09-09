using System;
using System.Collections.Generic;

namespace ArchaeoTrails.Application.Interfaces
{
    public interface IJwtTokenService
    {
        /// <summary>Issues a signed JWT for a successfully authenticated user.</summary>
        /// <param name="userId">Identity user id.</param>
        /// <param name="email">User's email — used as the JWT subject/name claim.</param>
        /// <param name="roles">All roles assigned to the user (usually just one).</param>
        /// <returns>The encoded token and its UTC expiry.</returns>
        (string Token, DateTime ExpiresAtUtc) CreateToken(Guid userId, string email, IEnumerable<string> roles);
    }
}
