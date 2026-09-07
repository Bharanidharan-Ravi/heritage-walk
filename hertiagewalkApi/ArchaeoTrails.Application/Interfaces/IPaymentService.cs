using System.Threading.Tasks;

namespace ArchaeoTrails.Application.Interfaces
{
    /// <summary>
    /// Abstraction over the payment gateway (Razorpay). Keep this interface
    /// gateway-agnostic so swapping providers later doesn't touch FormsController.
    /// </summary>
    public interface IPaymentService
    {
        /// <summary>
        /// Creates an order with the gateway for the given amount (major currency
        /// unit, e.g. rupees). Returns the gateway order id to hand to the
        /// frontend Checkout widget.
        /// </summary>
        Task<string> CreateOrderAsync(decimal amount, string currency);

        /// <summary>
        /// Verifies that (orderId, paymentId, signature) is a genuine,
        /// untampered callback from the gateway. THIS is the only check that
        /// should ever be treated as "payment succeeded" — never a client flag.
        /// </summary>
        bool VerifySignature(string orderId, string paymentId, string signature);
    }
}
