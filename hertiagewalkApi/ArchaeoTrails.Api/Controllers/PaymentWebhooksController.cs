using System.IO;
using System.Text;
using System.Threading.Tasks;
using ArchaeoTrails.Application.Features.Bookings;
using ArchaeoTrails.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ArchaeoTrails.Api.Controllers
{
    /// <summary>
    /// Server-to-server payment notifications. Point Cashfree:NotifyUrl (and/or
    /// the Cashfree dashboard's webhook setting) at
    /// https://&lt;api-host&gt;/api/payments/cashfree/webhook.
    ///
    /// The body is read raw — the signature is over the exact bytes Cashfree
    /// sent, so it must not be model-bound first. CORS doesn't apply (no
    /// browser involved).
    /// </summary>
    [ApiController]
    [Route("api/payments")]
    public class PaymentWebhooksController : ControllerBase
    {
        // Cashfree's payloads are a few KB; anything bigger isn't from them.
        private const int MaxBodyBytes = 64 * 1024;

        private readonly IBookingService _bookings;
        private readonly ILogger<PaymentWebhooksController> _logger;

        public PaymentWebhooksController(IBookingService bookings, ILogger<PaymentWebhooksController> logger)
        {
            _bookings = bookings;
            _logger = logger;
        }

        // POST /api/payments/cashfree/webhook  (Cashfree only — signature-checked)
        [HttpPost("cashfree/webhook")]
        [RequestSizeLimit(MaxBodyBytes)]
        public async Task<IActionResult> Cashfree()
        {
            string rawBody;
            using (var reader = new StreamReader(Request.Body, Encoding.UTF8))
            {
                rawBody = await reader.ReadToEndAsync();
            }

            var result = await _bookings.HandleGatewayWebhookAsync(
                rawBody,
                Request.Headers["x-webhook-timestamp"].ToString(),
                Request.Headers["x-webhook-signature"].ToString());

            switch (result.Outcome)
            {
                case WebhookOutcome.InvalidSignature:
                    _logger.LogWarning("Rejected Cashfree webhook with an invalid signature from {Ip}",
                        HttpContext.Connection.RemoteIpAddress);
                    return Unauthorized();
                case WebhookOutcome.RetryLater:
                    _logger.LogWarning("Cashfree webhook for {OrderId} not processed: {Message}", result.OrderId, result.Message);
                    return StatusCode(StatusCodes.Status503ServiceUnavailable);
                default:
                    _logger.LogInformation("Cashfree webhook for {OrderId}: {Message}", result.OrderId, result.Message);
                    return Ok();
            }
        }
    }
}
