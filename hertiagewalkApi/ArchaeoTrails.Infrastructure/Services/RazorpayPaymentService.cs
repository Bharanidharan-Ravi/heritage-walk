using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using ArchaeoTrails.Application.Interfaces;
using Microsoft.Extensions.Configuration;

namespace ArchaeoTrails.Infrastructure.Services
{
    /// <summary>
    /// Razorpay Orders API (REST, no SDK package needed) + checkout signature
    /// verification. Razorpay:KeyId / Razorpay:KeySecret must come from
    /// user-secrets (dev) or Azure App Service config (prod) — never
    /// appsettings.json. Use rzp_test_ keys while testing.
    /// </summary>
    public class RazorpayPaymentService : IPaymentService
    {
        private const string OrdersUrl = "https://api.razorpay.com/v1/orders";

        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;

        public RazorpayPaymentService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _configuration = configuration;
        }

        public static bool IsPlaceholder(string? value) =>
            string.IsNullOrWhiteSpace(value) || value == "REPLACE_ME";

        public async Task<string> CreateOrderAsync(decimal amount, string currency)
        {
            var keyId = _configuration["Razorpay:KeyId"];
            var keySecret = _configuration["Razorpay:KeySecret"];
            if (IsPlaceholder(keyId) || IsPlaceholder(keySecret))
            {
                throw new InvalidOperationException(
                    "Razorpay is not configured — set Razorpay:KeyId and Razorpay:KeySecret.");
            }

            using var request = new HttpRequestMessage(HttpMethod.Post, OrdersUrl)
            {
                Content = JsonContent.Create(new
                {
                    amount = (long)Math.Round(amount * 100m, MidpointRounding.AwayFromZero), // paise
                    currency = string.IsNullOrWhiteSpace(currency) ? "INR" : currency,
                    receipt = $"rcpt_{Guid.NewGuid():N}", // 37 chars, Razorpay max is 40
                    payment_capture = 1
                })
            };
            request.Headers.Authorization = new AuthenticationHeaderValue(
                "Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes($"{keyId}:{keySecret}")));

            using var response = await _httpClient.SendAsync(request);
            var body = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException(
                    $"Razorpay order creation failed ({(int)response.StatusCode}): {body}");
            }

            using var json = JsonDocument.Parse(body);
            return json.RootElement.GetProperty("id").GetString()
                ?? throw new InvalidOperationException("Razorpay returned no order id.");
        }

        public bool VerifySignature(string orderId, string paymentId, string signature)
        {
            var keySecret = _configuration["Razorpay:KeySecret"];
            if (IsPlaceholder(keySecret))
            {
                return false;
            }

            var payload = $"{orderId}|{paymentId}";
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(keySecret!));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
            var expectedSignature = Convert.ToHexString(hash).ToLowerInvariant();

            return CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(expectedSignature),
                Encoding.UTF8.GetBytes(signature ?? string.Empty));
        }
    }
}
