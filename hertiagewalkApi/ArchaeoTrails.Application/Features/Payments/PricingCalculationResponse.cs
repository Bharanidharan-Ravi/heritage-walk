using System.Collections.Generic;
using System.Text.Json.Serialization;
using ArchaeoTrails.Domain.Enums;

namespace ArchaeoTrails.Application.Features.Payments
{
    public enum PriceSuggestionStrategy
    {
        Exact,
        Rounded,
        Attractive,
        Premium
    }

    public class SuggestedPrice
    {
        public decimal Amount { get; set; }

        [JsonConverter(typeof(JsonStringEnumConverter))]
        public PriceSuggestionStrategy Strategy { get; set; }

        public string Label { get; set; } = string.Empty;
    }

    /// <summary>
    /// Fee amounts are computed on the effective customer amount: CustomerAmount
    /// when supplied, otherwise MinimumCustomerAmount. ExpectedNetAmount is what
    /// ArchaeoTrails receives at that amount; AdditionalMargin is the part above BaseAmount.
    /// </summary>
    public class PricingCalculationResponse
    {
        public decimal BaseAmount { get; set; }

        public decimal PlatformFeePercent { get; set; }
        public decimal PlatformFeeAmount { get; set; }

        public decimal GatewayFeePercent { get; set; }
        public decimal GatewayGstPercent { get; set; }
        public decimal GatewayFeeAmount { get; set; }
        public decimal GatewayGstAmount { get; set; }

        public decimal MinimumCustomerAmount { get; set; }
        public decimal? CustomerAmount { get; set; }

        public decimal ExpectedNetAmount { get; set; }
        public decimal AdditionalMargin { get; set; }

        public string Currency { get; set; } = "INR";

        [JsonConverter(typeof(JsonStringEnumConverter))]
        public PaymentPricingMode PricingMode { get; set; }

        [JsonConverter(typeof(JsonStringEnumConverter))]
        public PaymentEnvironment PaymentEnvironment { get; set; }

        public bool IsValid { get; set; }
        public string? ValidationMessage { get; set; }

        public IReadOnlyList<SuggestedPrice> SuggestedPrices { get; set; } = new List<SuggestedPrice>();
    }
}
