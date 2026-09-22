using System;
using System.Text.Json.Serialization;
using ArchaeoTrails.Domain.Enums;

namespace ArchaeoTrails.Application.Features.Payments
{
    /// <summary>
    /// Admin-facing view of PaymentSettings. Never carries gateway credentials.
    /// Enums serialize as strings on this DTO only, so the app-wide JSON
    /// options used by the other controllers stay untouched.
    /// </summary>
    public class PaymentSettingsDto
    {
        public Guid Id { get; set; }

        [JsonConverter(typeof(JsonStringEnumConverter))]
        public PaymentProvider Provider { get; set; }

        [JsonConverter(typeof(JsonStringEnumConverter))]
        public PaymentEnvironment Environment { get; set; }

        public bool IsEnabled { get; set; }
        public decimal PlatformFeePercent { get; set; }
        public decimal GatewayFeePercent { get; set; }
        public decimal GatewayGstPercent { get; set; }

        [JsonConverter(typeof(JsonStringEnumConverter))]
        public PaymentPricingMode PricingMode { get; set; }

        public string Currency { get; set; } = "INR";
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public Guid? UpdatedByUserId { get; set; }
    }

    public class PaymentSettingsResult
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public PaymentSettingsDto? Data { get; set; }

        public static PaymentSettingsResult Ok(PaymentSettingsDto data) => new() { Success = true, Data = data };
        public static PaymentSettingsResult Fail(string message) => new() { Success = false, Message = message };
    }
}
