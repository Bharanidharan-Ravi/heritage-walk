using System;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using ArchaeoTrails.Application.Interfaces;
using Microsoft.Extensions.Configuration;

namespace ArchaeoTrails.Infrastructure.Services
{
    /// <summary>
    /// DRY / STUB implementation — does not call Razorpay yet.
    /// TODO(form-generator): once the `Razorpay.Api` NuGet package is added and
    /// Razorpay:KeyId / Razorpay:KeySecret are configured (user-secrets / Azure
    /// App Service config, never appsettings.json), replace CreateOrderAsync's
    /// body with a real call:
    ///
    ///   var client = new RazorpayClient(keyId, keySecret);
    ///   var options = new Dictionary&lt;string, object&gt; {
    ///       { "amount", (int)(amount * 100) }, // paise
    ///       { "currency", currency },
    ///       { "payment_capture", 1 }
    ///   };
    ///   Order order = client.Order.Create(options);
    ///   return order["id"].ToString();
    ///
    /// VerifySignature's HMAC logic below IS the real algorithm Razorpay
    /// documents (orderId + "|" + paymentId, HMAC-SHA256 with the key secret) —
    /// that part is safe to keep once a real KeySecret is configured.
    /// </summary>
    public class RazorpayPaymentService : IPaymentService
    {
        private readonly IConfiguration _configuration;

        public RazorpayPaymentService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public Task<string> CreateOrderAsync(decimal amount, string currency)
        {
            // TODO(form-generator): replace with a real Razorpay Orders API call.
            var fakeOrderId = $"order_DRYRUN_{Guid.NewGuid():N}";
            return Task.FromResult(fakeOrderId);
        }

        public bool VerifySignature(string orderId, string paymentId, string signature)
        {
            var keySecret = _configuration["Razorpay:KeySecret"];

            // TODO(form-generator): remove this bypass once Razorpay:KeySecret is
            // configured — until then every "payment" is treated as unverified in
            // real deployments, and this method returns false rather than lying.
            if (string.IsNullOrWhiteSpace(keySecret) || keySecret == "REPLACE_ME")
            {
                return false;
            }

            var payload = $"{orderId}|{paymentId}";
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(keySecret));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
            var expectedSignature = Convert.ToHexString(hash).ToLowerInvariant();

            return CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(expectedSignature),
                Encoding.UTF8.GetBytes(signature ?? string.Empty));
        }
    }
}
