using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ArchaeoTrails.Application.Features.Auth;
using ArchaeoTrails.Application.Features.Users;
using ArchaeoTrails.Application.Interfaces;
using ArchaeoTrails.Domain.Constants;
using ArchaeoTrails.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;

namespace ArchaeoTrails.Infrastructure.Services
{
    /// <summary>Admin-only account/role management, backed by ASP.NET Core Identity.</summary>
    public class UserManagementService : IUserManagementService
    {
        private readonly UserManager<ApplicationUser> _userManager;

        public UserManagementService(UserManager<ApplicationUser> userManager)
        {
            _userManager = userManager;
        }

        public async Task<IReadOnlyList<UserDto>> ListAsync()
        {
            var users = _userManager.Users.OrderByDescending(u => u.CreatedAt).ToList();
            var result = new List<UserDto>(users.Count);

            foreach (var user in users)
            {
                var roles = await _userManager.GetRolesAsync(user);
                result.Add(new UserDto
                {
                    Id = user.Id,
                    UserName = user.UserName ?? string.Empty,
                    Email = user.Email ?? string.Empty,
                    FullName = user.FullName,
                    Role = roles.FirstOrDefault() ?? string.Empty,
                    IsActive = user.IsActive,
                    CreatedAt = user.CreatedAt
                });
            }

            return result;
        }

        public async Task<UserOperationResult> CreateAsync(CreateUserRequest request)
        {
            if (!Roles.All.Contains(request.Role))
            {
                return Fail($"Role must be one of: {string.Join(", ", Roles.All)}.");
            }

            var userName = request.UserName?.Trim() ?? string.Empty;
            if (!UserNameRules.IsValid(userName))
            {
                return Fail(UserNameRules.Description);
            }

            if (await _userManager.FindByNameAsync(userName) is not null)
            {
                return Fail("That username is already taken.");
            }

            var existing = await _userManager.FindByEmailAsync(request.Email);
            if (existing is not null)
            {
                return Fail("An account with this email already exists.");
            }

            var user = new ApplicationUser
            {
                // Username is the Admin-entered handle, not the email.
                UserName = userName,
                Email = request.Email,
                FullName = request.FullName,
                IsActive = true
            };

            var createResult = await _userManager.CreateAsync(user, request.Password);
            if (!createResult.Succeeded)
            {
                return Fail("Could not create account.", createResult.Errors.Select(e => e.Description));
            }

            var roleResult = await _userManager.AddToRoleAsync(user, request.Role);
            if (!roleResult.Succeeded)
            {
                // Roll back the orphaned account rather than leaving a roleless user.
                await _userManager.DeleteAsync(user);
                return Fail("Could not assign role.", roleResult.Errors.Select(e => e.Description));
            }

            return new UserOperationResult { Success = true, Message = "Account created." };
        }

        /// <summary>
        /// Administrative credential reset. The target account's current
        /// password is never required — the endpoint itself is Admin-gated
        /// (see UsersController). Existing JWTs already issued to the account
        /// stay valid until they expire; tokens are stateless and are not
        /// re-checked against Identity's security stamp.
        /// </summary>
        public async Task<UserOperationResult> UpdateCredentialsAsync(Guid userId, UpdateUserCredentialsRequest request)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user is null) return Fail("User not found.");

            var newUserName = request.UserName?.Trim();
            var newPassword = request.NewPassword;

            var changingUserName = !string.IsNullOrWhiteSpace(newUserName) &&
                                   !string.Equals(newUserName, user.UserName, StringComparison.OrdinalIgnoreCase);
            var changingPassword = !string.IsNullOrWhiteSpace(newPassword);

            if (!changingUserName && !changingPassword)
            {
                return Fail("Nothing to update — supply a new username, a new password, or both.");
            }

            if (changingUserName)
            {
                if (!UserNameRules.IsValid(newUserName))
                {
                    return Fail(UserNameRules.Description);
                }

                var taken = await _userManager.FindByNameAsync(newUserName!);
                if (taken is not null && taken.Id != user.Id)
                {
                    return Fail("That username is already taken.");
                }

                var renameResult = await _userManager.SetUserNameAsync(user, newUserName);
                if (!renameResult.Succeeded)
                {
                    return Fail("Could not update username.", renameResult.Errors.Select(e => e.Description));
                }
            }

            if (changingPassword)
            {
                // Admin reset: go through a reset token rather than
                // ChangePasswordAsync so the old password isn't needed.
                var resetToken = await _userManager.GeneratePasswordResetTokenAsync(user);
                var passwordResult = await _userManager.ResetPasswordAsync(user, resetToken, newPassword!);
                if (!passwordResult.Succeeded)
                {
                    // The username (if it changed) is already saved at this
                    // point — report precisely so the Admin knows what stuck.
                    return Fail(
                        changingUserName
                            ? "Username updated, but the password could not be changed."
                            : "Could not change password.",
                        passwordResult.Errors.Select(e => e.Description));
                }
            }

            var message = (changingUserName, changingPassword) switch
            {
                (true, true) => "Username and password updated.",
                (true, false) => "Username updated.",
                _ => "Password updated."
            };

            return new UserOperationResult { Success = true, Message = message };
        }

        public async Task<UserOperationResult> UpdateRoleAsync(Guid userId, string role)
        {
            if (!Roles.All.Contains(role))
            {
                return Fail($"Role must be one of: {string.Join(", ", Roles.All)}.");
            }

            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user is null) return Fail("User not found.");

            var currentRoles = await _userManager.GetRolesAsync(user);
            var removeResult = await _userManager.RemoveFromRolesAsync(user, currentRoles);
            if (!removeResult.Succeeded)
            {
                return Fail("Could not update role.", removeResult.Errors.Select(e => e.Description));
            }

            var addResult = await _userManager.AddToRoleAsync(user, role);
            if (!addResult.Succeeded)
            {
                return Fail("Could not update role.", addResult.Errors.Select(e => e.Description));
            }

            return new UserOperationResult { Success = true, Message = "Role updated." };
        }

        public async Task<UserOperationResult> UpdateStatusAsync(Guid userId, bool isActive)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user is null) return Fail("User not found.");

            user.IsActive = isActive;
            var result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                return Fail("Could not update status.", result.Errors.Select(e => e.Description));
            }

            return new UserOperationResult { Success = true, Message = isActive ? "Account activated." : "Account deactivated." };
        }

        private static UserOperationResult Fail(string message, IEnumerable<string>? errors = null) =>
            new() { Success = false, Message = message, Errors = errors };
    }
}
