using System.Threading.Tasks;
using ArchaeoTrails.Application.Features.Payments;

namespace ArchaeoTrails.Application.Interfaces
{
    /// <summary>
    /// The payment gateway used by bookings (Cashfree). Separate from the older
    /// IPaymentService, which the standalone-form /order + /submit flow still
    /// uses until it's moved onto bookings too.
    ///
    /// A payment only ever counts as successful from GetOrderStatusAsync — never
    /// from the browser coming back. A signature-verified webhook only prompts
    /// that check; it isn't trusted on its own.
    /// </summary>
    public interface IPaymentGateway
    {
        /// <summary>Gateway name stored on the booking ("Cashfree").</summary>
        string Name { get; }

        Task<GatewayOrderResult> CreateOrderAsync(GatewayOrderRequest request);

        Task<GatewayOrderStatus> GetOrderStatusAsync(string orderId, Domain.Enums.PaymentEnvironment environment);

        /// <summary>
        /// Cancels an unpaid order so it can't be paid any more. False if the
        /// gateway refused (e.g. a payment on it is still processing).
        /// </summary>
        Task<bool> TerminateOrderAsync(string orderId, Domain.Enums.PaymentEnvironment environment);

        /// <summary>
        /// Checks a webhook's signature against the exact raw body (re-serialised
        /// JSON won't match) and reads the order / payment ids out of it.
        /// </summary>
        GatewayWebhookEvent ParseWebhook(string rawBody, string? timestamp, string? signature);
    }
}
