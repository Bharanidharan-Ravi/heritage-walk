using System;
using System.Security.Claims;
using System.Threading.Tasks;
using ArchaeoTrails.Application.Features.Auth;
using ArchaeoTrails.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ArchaeoTrails.Api.Controllers
{
    /// <summary>
    /// Login for the admin panel (Admin/Employee/User accounts). There is no
    /// self-registration route — accounts are provisioned by an Admin via
    /// UsersController.
    /// </summary>
    [ApiController]
    [Route("api/auth")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        // POST /api/auth/login (public)
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var result = await _authService.LoginAsync(request);
            if (!result.Success)
            {
                return Unauthorized(result);
            }

            return Ok(result);
        }

        // GET /api/auth/me (any authenticated admin-panel account)
        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> Me()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub");
            if (userIdClaim is null || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized();
            }

            var user = await _authService.GetByIdAsync(userId);
            if (user is null) return Unauthorized();

            return Ok(user);
        }
    }
}
