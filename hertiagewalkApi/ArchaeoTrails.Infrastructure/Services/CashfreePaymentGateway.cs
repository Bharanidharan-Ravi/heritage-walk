using System;
using System.Globalization;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using ArchaeoTrails.Application.Features.Payments;
using ArchaeoTrails.Application.Interfaces;
using ArchaeoTrails.Domain.Enums;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace ArchaeoTrails.Infrastructure.Services
{
    /// <summary>
    /// Cashfree Payment Gateway (PG) Orders API over plain HttpClient — no SDK.
    /// Sandbox vs production is PaymentSettings.Environment (Admin-controlled),
    /// and each has its own key pair: Cashfree:Sandbox:AppId/SecretKey and
    /// Cashfree:Production:AppId/SecretKey (a plain Cashfree:AppId/SecretKey is
    /// the fallback for either). They come from user-secrets (dev) or Azure App
    /// Service configuration (prod) — never appsettings.json, and the secret
    /// never reaches the frontend (it only gets payment_session_id).
    /// </summary>
    public class CashfreePaymentGateway : IPaymentGateway
    {
        private const string SandboxBaseUrl = "https://sandbox.cashfree.com/pg";
        private const string ProductionBaseUrl = "https://api.cashfree.com/pg";

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };

        private readonly HttpClient _http;
        private readonly IConfiguration _configuration;
        private readonly ILogger<CashfreePaymentGateway> _logger;

        public CashfreePaymentGateway(HttpClient http, IConfiguration configuration, ILogger<CashfreePaymentGateway> logger)
        {
            _http = http;
            _configuration = configuration;
            _logger = logger;
        }

        public string Name => "Cashfree";

        public async Task<GatewayOrderResult> CreateOrderAsync(GatewayOrderRequest request)
        {
            if (!TryBuildRequest(HttpMethod.Post, request.Environment, "/orders", out var message, out var configError))
            {
                return new GatewayOrderResult { Success = false, Error = configError };
            }

            var body = new CashfreeCreateOrder
            {
                OrderId = request.OrderId,
                OrderAmount = request.Amount,
                OrderCurrency = request.Currency,
                OrderNote = request.Note,
                // ISO 8601 in UTC ("Z"). Not "+05:30": System.Text.Json escapes '+'
                // as +, which Cashfree rejects (order_expiry_time_invalid).
                OrderExpiryTime = DateTime.SpecifyKind(request.ExpiresAt, DateTimeKind.Utc)
                    .ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture),
                CustomerDetails = new CashfreeCustomer
                {
                    CustomerId = request.CustomerId,
                    CustomerPhone = request.CustomerPhone,
                    CustomerName = request.CustomerName,
                    CustomerEmail = string.IsNullOrWhiteSpace(request.CustomerEmail) ? null : request.CustomerEmail
                },
                OrderMeta = new CashfreeOrderMeta
                {
                    ReturnUrl = ConfiguredUrl("Cashfree:ReturnUrl"),
                    NotifyUrl = ConfiguredUrl("Cashfree:NotifyUrl")
                }
            };
            message!.Content = JsonContent.Create(body, options: JsonOptions);

            try
            {
                using var response = await _http.SendAsync(message);
                var raw = await response.Content.ReadAsStringAsync();
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Cashfree create order {OrderId} failed: {Status} {Body}",
                        request.OrderId, (int)response.StatusCode, raw);
                    return new GatewayOrderResult { Success = false, Error = ReadError(raw) ?? response.StatusCode.ToString() };
                }

                var order = JsonSerializer.Deserialize<CashfreeOrder>(raw);
                return new GatewayOrderResult
                {
                    Success = !string.IsNullOrEmpty(order?.PaymentSessionId),
                    PaymentSessionId = order?.PaymentSessionId,
                    GatewayReference = order?.CfOrderId?.ToString()
                };
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
            {
                _logger.LogError(ex, "Cashfree create order {OrderId} threw", request.OrderId);
                return new GatewayOrderResult { Success = false, Error = "Cashfree unreachable." };
            }
        }

        public async Task<GatewayOrderStatus> GetOrderStatusAsync(string orderId, PaymentEnvironment environment)
        {
            if (!TryBuildRequest(HttpMethod.Get, environment, "/orders/" + Uri.EscapeDataString(orderId), out var message, out var configError))
            {
                return new GatewayOrderStatus { Found = false, Unavailable = true, Error = configError };
            }

            try
            {
                using var response = await _http.SendAsync(message!);
                var raw = await response.Content.ReadAsStringAsync();
                if (response.StatusCode == HttpStatusCode.NotFound)
                {
                    return new GatewayOrderStatus { Found = false, Error = "Order not found at Cashfree." };
                }
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Cashfree get order {OrderId} failed: {Status} {Body}", orderId, (int)response.StatusCode, raw);
                    return new GatewayOrderStatus { Found = false, Unavailable = true, Error = ReadError(raw) };
                }

                var order = JsonSerializer.Deserialize<CashfreeOrder>(raw);
                return new GatewayOrderStatus
                {
                    Found = order is not null,
                    Status = order?.OrderStatus ?? string.Empty,
                    Amount = order?.OrderAmount ?? 0m,
                    Currency = order?.OrderCurrency ?? string.Empty
                };
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
            {
                _logger.LogError(ex, "Cashfree get order {OrderId} threw", orderId);
                return new GatewayOrderStatus { Found = false, Unavailable = true, Error = "Cashfree unreachable." };
            }
        }

        public async Task<bool> TerminateOrderAsync(string orderId, PaymentEnvironment environment)
        {
            if (!TryBuildRequest(HttpMethod.Patch, environment, "/orders/" + Uri.EscapeDataString(orderId), out var message, out _))
            {
                return false;
            }
            message!.Content = JsonContent.Create(new { order_status = "TERMINATED" });

            try
            {
                using var response = await _http.SendAsync(message);
                if (response.IsSuccessStatusCode) return true;
                // Refused while a payment on it is still in flight — keep the hold.
                _logger.LogWarning("Cashfree terminate order {OrderId} failed: {Status} {Body}",
                    orderId, (int)response.StatusCode, await response.Content.ReadAsStringAsync());
                return false;
            }
            catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
            {
                _logger.LogError(ex, "Cashfree terminate order {OrderId} threw", orderId);
                return false;
            }
        }

        public GatewayWebhookEvent ParseWebhook(string rawBody, string? timestamp, string? signature)
        {
            // Cashfree signs Base64(HMAC-SHA256(secret key, x-webhook-timestamp + raw body)).
            // The webhook doesn't say which environment sent it, so any configured
            // secret may match (sandbox orders still settle after a switch to production).
            var secrets = new[]
                {
                    _configuration["Cashfree:Production:SecretKey"],
                    _configuration["Cashfree:Sandbox:SecretKey"],
                    _configuration["Cashfree:SecretKey"]
                }
                .Where(s => !IsPlaceholder(s))
                .Distinct()
                .ToList();
            if (secrets.Count == 0 || string.IsNullOrEmpty(timestamp) || string.IsNullOrEmpty(signature))
            {
                return new GatewayWebhookEvent { SignatureValid = false };
            }

            var signed = Encoding.UTF8.GetBytes(timestamp + rawBody);
            var given = Encoding.UTF8.GetBytes(signature);
            var matched = false;
            foreach (var secret in secrets)
            {
                using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret!));
                var expected = Encoding.UTF8.GetBytes(Convert.ToBase64String(hmac.ComputeHash(signed)));
                matched |= CryptographicOperations.FixedTimeEquals(expected, given);
            }
            if (!matched)
            {
                return new GatewayWebhookEvent { SignatureValid = false };
            }

            var parsed = new GatewayWebhookEvent { SignatureValid = true };
            try
            {
                using var doc = JsonDocument.Parse(rawBody);
                var root = doc.RootElement;
                parsed.EventType = ReadString(root, "type");
                if (root.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Object)
                {
                    if (data.TryGetProperty("order", out var order)) parsed.OrderId = ReadString(order, "order_id");
                    if (data.TryGetProperty("payment", out var payment)) parsed.PaymentId = ReadString(payment, "cf_payment_id");
                }
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Cashfree webhook body isn't valid JSON");
            }
            return parsed;
        }

        /// <summary>A string or number property as text (cf_payment_id comes as a number).</summary>
        private static string? ReadString(JsonElement element, string name)
        {
            if (element.ValueKind != JsonValueKind.Object || !element.TryGetProperty(name, out var value)) return null;
            return value.ValueKind switch
            {
                JsonValueKind.String => value.GetString(),
                JsonValueKind.Number => value.GetRawText(),
                _ => null
            };
        }

        private bool TryBuildRequest(HttpMethod method, PaymentEnvironment environment, string path,
            out HttpRequestMessage? message, out string? error)
        {
            var section = environment == PaymentEnvironment.Production ? "Production" : "Sandbox";
            var appId = _configuration[$"Cashfree:{section}:AppId"];
            var secret = _configuration[$"Cashfree:{section}:SecretKey"];
            if (IsPlaceholder(appId) || IsPlaceholder(secret))
            {
                appId = _configuration["Cashfree:AppId"];
                secret = _configuration["Cashfree:SecretKey"];
            }
            if (IsPlaceholder(appId) || IsPlaceholder(secret))
            {
                _logger.LogError("Cashfree:{Section}:AppId / SecretKey are not configured (user-secrets / App Service config).", section);
                message = null;
                error = $"Cashfree ({section.ToLowerInvariant()}) is not configured.";
                return false;
            }

            var baseUrl = environment == PaymentEnvironment.Production ? ProductionBaseUrl : SandboxBaseUrl;
            message = new HttpRequestMessage(method, baseUrl + path);
            message.Headers.Add("x-client-id", appId);
            message.Headers.Add("x-client-secret", secret);
            message.Headers.Add("x-api-version", _configuration["Cashfree:ApiVersion"] ?? "2023-08-01");
            message.Headers.Add("Accept", "application/json");
            error = null;
            return true;
        }

        /// <summary>A configured URL, or null if unset / placeholder (Cashfree rejects bad URLs).</summary>
        private string? ConfiguredUrl(string key)
        {
            var value = _configuration[key];
            return IsPlaceholder(value) || value!.Contains('<') ? null : value;
        }

        private static bool IsPlaceholder(string? value) =>
            string.IsNullOrWhiteSpace(value) || value == "REPLACE_ME";

        private static string? ReadError(string raw)
        {
            try
            {
                using var doc = JsonDocument.Parse(raw);
                return doc.RootElement.TryGetProperty("message", out var m) ? m.GetString() : null;
            }
            catch (JsonException)
            {
                return null;
            }
        }

        // ---- Cashfree wire shapes (snake_case) ----

        private sealed class CashfreeCreateOrder
        {
            [JsonPropertyName("order_id")] public string OrderId { get; set; } = string.Empty;
            [JsonPropertyName("order_amount")] public decimal OrderAmount { get; set; }
            [JsonPropertyName("order_currency")] public string OrderCurrency { get; set; } = "INR";
            [JsonPropertyName("order_note")] public string? OrderNote { get; set; }
            [JsonPropertyName("order_expiry_time")] public string? OrderExpiryTime { get; set; }
            [JsonPropertyName("customer_details")] public CashfreeCustomer CustomerDetails { get; set; } = new();
            [JsonPropertyName("order_meta")] public CashfreeOrderMeta? OrderMeta { get; set; }
        }

        private sealed class CashfreeCustomer
        {
            [JsonPropertyName("customer_id")] public string CustomerId { get; set; } = string.Empty;
            [JsonPropertyName("customer_phone")] public string CustomerPhone { get; set; } = string.Empty;
            [JsonPropertyName("customer_name")] public string? CustomerName { get; set; }
            [JsonPropertyName("customer_email")] public string? CustomerEmail { get; set; }
        }

        private sealed class CashfreeOrderMeta
        {
            /// <summary>Cashfree substitutes {order_id} in this URL.</summary>
            [JsonPropertyName("return_url")] public string? ReturnUrl { get; set; }
            [JsonPropertyName("notify_url")] public string? NotifyUrl { get; set; }
        }

        private sealed class CashfreeOrder
        {
            [JsonPropertyName("cf_order_id")] public JsonElement? CfOrderId { get; set; }
            [JsonPropertyName("order_id")] public string? OrderId { get; set; }
            [JsonPropertyName("order_status")] public string? OrderStatus { get; set; }
            [JsonPropertyName("order_amount")] public decimal OrderAmount { get; set; }
            [JsonPropertyName("order_currency")] public string? OrderCurrency { get; set; }
            [JsonPropertyName("payment_session_id")] public string? PaymentSessionId { get; set; }
        }
    }
}
