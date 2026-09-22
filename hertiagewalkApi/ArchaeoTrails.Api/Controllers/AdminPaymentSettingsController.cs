using System;
using System.Security.Claims;
using System.Threading.Tasks;
using ArchaeoTrails.Application.Features.Payments;
using ArchaeoTrails.Application.Interfaces;
using ArchaeoTrails.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ArchaeoTrails.Api.Controllers
{
    /// <summary>
    /// Payment configuration + pricing calculator. Admin-only — Employees and
    /// Users must never be able to read or change payment settings. Responses
    /// never include gateway credentials (they aren't stored in the database).
    /// </summary>
    [ApiController]
    [Route("api/admin/payment-settings")]
    [Authorize(Roles = Roles.Admin)]
    public class AdminPaymentSettingsController : ControllerBase
    {
        private readonly IPaymentSettingsService _settings;
        private readonly IPricingService _pricing;

        public AdminPaymentSettingsController(IPaymentSettingsService settings, IPricingService pricing)
        {
            _settings = settings;
            _pricing = pricing;
        }

        // GET /api/admin/payment-settings
        [HttpGet]
        public async Task<IActionResult> Get() => Ok(await _settings.GetAsync());

        // PUT /api/admin/payment-settings
        [HttpPut]
        public async Task<IActionResult> Update([FromBody] UpdatePaymentSettingsRequest request)
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();

            var result = await _settings.UpdateAsync(request, userId.Value);
            return result.Success
                ? Ok(result.Data)
                : BadRequest(new { status = "error", message = result.Message });
        }

        // POST /api/admin/payment-settings/calculate-price
        [HttpPost("calculate-price")]
        public async Task<IActionResult> CalculatePrice([FromBody] CalculatePriceRequest request)
        {
            var current = await _settings.GetCurrentEntityAsync();
            return ToResult(_pricing.Calculate(request.BaseAmount, current, request.CustomerAmount));
        }

        // GET /api/admin/payment-settings/preview?baseAmount=1000
        [HttpGet("preview")]
        public async Task<IActionResult> Preview([FromQuery] decimal baseAmount)
        {
            var current = await _settings.GetCurrentEntityAsync();
            return ToResult(_pricing.Calculate(baseAmount, current));
        }

        // Invalid input -> 400 in the project's standard { status, message } shape,
        // with the calculation attached so the admin UI can still show the numbers.
        private IActionResult ToResult(PricingCalculationResponse response) =>
            response.IsValid
                ? Ok(response)
                : BadRequest(new { status = "error", message = response.ValidationMessage, data = response });

        private Guid? GetUserId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            return Guid.TryParse(claim, out var id) ? id : null;
        }
    }
}
