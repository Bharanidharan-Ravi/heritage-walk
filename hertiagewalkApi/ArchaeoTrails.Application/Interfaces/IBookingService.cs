using System.Threading.Tasks;
using ArchaeoTrails.Application.Features.Bookings;

namespace ArchaeoTrails.Application.Interfaces
{
    /// <summary>
    /// Experience bookings paid through IPaymentGateway. See
    /// docs/form-generator/CASHFREE_BOOKING_PLAN.md for the full flow.
    /// </summary>
    public interface IBookingService
    {
        /// <summary>
        /// Validates the booking, works out the amount from the database, saves a
        /// PendingPayment booking that holds the seats/date for the hold period,
        /// and opens a gateway order for it.
        /// </summary>
        Task<BookingResult<CreateBookingResponse>> CreatePendingAsync(CreateBookingRequest request);

        /// <summary>Public booking status for the confirmation page.</summary>
        Task<BookingResult<BookingStatusDto>> GetStatusAsync(string bookingRef);

        /// <summary>
        /// "Complete payment" on the confirmation page: hands back the same
        /// order's payment session while its hold is still live (or AlreadyPaid
        /// if it turns out it was paid). Never a new order or a new amount.
        /// </summary>
        Task<BookingResult<CreateBookingResponse>> RetryPaymentAsync(string bookingRef);

        /// <summary>
        /// A gateway webhook: verifies its signature on the raw body, logs it to
        /// PaymentWebhookEvents, then re-checks the order with the gateway and
        /// confirms the booking if it's paid.
        /// </summary>
        Task<WebhookResult> HandleGatewayWebhookAsync(string rawBody, string? timestamp, string? signature);

        /// <summary>
        /// Background sweep: pending bookings whose hold (plus a grace period)
        /// has run out are confirmed if the gateway says they were paid after
        /// all, otherwise marked Expired. Returns how many were expired.
        /// </summary>
        Task<int> ExpireStaleHoldsAsync();
    }
}
