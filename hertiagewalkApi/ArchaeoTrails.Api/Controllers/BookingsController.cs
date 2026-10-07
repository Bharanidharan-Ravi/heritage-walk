using System.Threading.Tasks;
using ArchaeoTrails.Application.Features.Bookings;
using ArchaeoTrails.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ArchaeoTrails.Api.Controllers
{
    /// <summary>
    /// Experience bookings paid through Cashfree ("Pay Now"). Thin — all rules
    /// live in IBookingService. See docs/form-generator/CASHFREE_BOOKING_PLAN.md.
    /// Public, so every route is rate-limited per IP (policies in Program.cs).
    /// </summary>
    [ApiController]
    [Route("api/bookings")]
    public class BookingsController : ControllerBase
    {
        private readonly IBookingService _bookings;

        public BookingsController(IBookingService bookings)
        {
            _bookings = bookings;
        }

        // POST /api/bookings  (public) — "Pay Now": saves a pending booking and
        // returns the Cashfree payment_session_id for the frontend checkout.
        [HttpPost]
        [EnableRateLimiting(RateLimitPolicies.BookingWrite)]
        public async Task<IActionResult> Create([FromBody] CreateBookingRequest request)
        {
            var result = await _bookings.CreatePendingAsync(request);
            return result.Success ? Ok(result.Value) : ToError(result);
        }

        // GET /api/bookings/{bookingRef}  (public) — the confirmation page's status.
        [HttpGet("{bookingRef}")]
        [EnableRateLimiting(RateLimitPolicies.BookingRead)]
        public async Task<IActionResult> Get(string bookingRef)
        {
            var result = await _bookings.GetStatusAsync(bookingRef);
            return result.Success ? Ok(result.Value) : ToError(result);
        }

        // POST /api/bookings/{bookingRef}/retry  (public) — "Complete payment":
        // the same order's payment_session_id while its hold is still live.
        [HttpPost("{bookingRef}/retry")]
        [EnableRateLimiting(RateLimitPolicies.BookingWrite)]
        public async Task<IActionResult> Retry(string bookingRef)
        {
            var result = await _bookings.RetryPaymentAsync(bookingRef);
            return result.Success ? Ok(result.Value) : ToError(result);
        }

        private IActionResult ToError<T>(BookingResult<T> result)
        {
            var body = new { status = "error", message = result.Message };
            return result.Error switch
            {
                BookingError.NotFound => NotFound(body),
                BookingError.Unavailable => Conflict(body),
                BookingError.Gateway => StatusCode(StatusCodes.Status502BadGateway, body),
                _ => BadRequest(body)
            };
        }
    }

    /// <summary>Names of the rate-limit policies registered in Program.cs.</summary>
    public static class RateLimitPolicies
    {
        /// <summary>Status reads — the confirmation page polls this.</summary>
        public const string BookingRead = "booking-read";

        /// <summary>Creating a booking / reopening checkout — each one calls Cashfree.</summary>
        public const string BookingWrite = "booking-write";
    }
}
