using System;
using System.Threading.Tasks;
using ArchaeoTrails.Application.Features.Users;
using ArchaeoTrails.Application.Interfaces;
using ArchaeoTrails.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ArchaeoTrails.Api.Controllers
{
    /// <summary>
    /// Admin-only account/role management for the admin panel. The "User"
    /// role is reserved here for the future, separate student-facing portal —
    /// this whole controller (and every route in it) must stay Admin-only so
    /// a User-role account can never reach it.
    /// </summary>
    [ApiController]
    [Route("api/users")]
    [Authorize(Roles = Roles.Admin)]
    public class UsersController : ControllerBase
    {
        private readonly IUserManagementService _userManagementService;

        public UsersController(IUserManagementService userManagementService)
        {
            _userManagementService = userManagementService;
        }

        // GET /api/users
        [HttpGet]
        public async Task<IActionResult> List()
        {
            var users = await _userManagementService.ListAsync();
            return Ok(users);
        }

        // POST /api/users
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
        {
            var result = await _userManagementService.CreateAsync(request);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        // PUT /api/users/{id}/role
        [HttpPut("{id:guid}/role")]
        public async Task<IActionResult> UpdateRole(Guid id, [FromBody] UpdateUserRoleRequest request)
        {
            var result = await _userManagementService.UpdateRoleAsync(id, request.Role);
            return result.Success ? Ok(result) : BadRequest(result);
        }

        // PUT /api/users/{id}/status
        [HttpPut("{id:guid}/status")]
        public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateUserStatusRequest request)
        {
            var result = await _userManagementService.UpdateStatusAsync(id, request.IsActive);
            return result.Success ? Ok(result) : BadRequest(result);
        }
    }
}
