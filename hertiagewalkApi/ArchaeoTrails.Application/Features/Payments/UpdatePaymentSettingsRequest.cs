using System.Text.Json.Serialization;
using ArchaeoTrails.Domain.Enums;

namespace ArchaeoTrails.Application.Features.Payments
{
    /// <summary>
    /// Every field is nullable so an omitted field is reported as missing
    /// instead of silently becoming 0 / false / the first enum member.
    /// </summary>
    public class UpdatePaymentSettingsRequest
    {
        [JsonConverter(typeof(JsonStringEnumConverter))]
        public PaymentProvider? Provider { get; set; }

        [JsonConverter(typeof(JsonStringEnumConverter))]
        public PaymentEnvironment? Environment { get; set; }

        public bool? IsEnabled { get; set; }
        public decimal? PlatformFeePercent { get; set; }
        public decimal? GatewayFeePercent { get; set; }
        public decimal? GatewayGstPercent { get; set; }

        [JsonConverter(typeof(JsonStringEnumConverter))]
        public PaymentPricingMode? PricingMode { get; set; }

        public string? Currency { get; set; }
    }
}
