using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ArchaeoTrails.Application.Features.Auth;
using ArchaeoTrails.Application.Features.Users;

namespace ArchaeoTrails.Application.Interfaces
{
    /// <summary>Admin-only user/role management — see UsersController.</summary>
    public interface IUserManagementService
    {
        Task<IReadOnlyList<UserDto>> ListAsync();
        Task<UserOperationResult> CreateAsync(CreateUserRequest request);
        Task<UserOperationResult> UpdateRoleAsync(Guid userId, string role);
        Task<UserOperationResult> UpdateStatusAsync(Guid userId, bool isActive);
    }
}
