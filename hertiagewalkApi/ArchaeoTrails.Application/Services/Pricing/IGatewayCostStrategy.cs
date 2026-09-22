using ArchaeoTrails.Domain.Entities;
using ArchaeoTrails.Domain.Enums;

namespace ArchaeoTrails.Application.Services.Pricing
{
    /// <summary>
    /// Gateway cost expressed as fractions of the customer amount (0.02 = 2%).
    /// GST is kept separate from the fee because it is reported separately.
    /// </summary>
    public readonly record struct GatewayCostRates(decimal FeeRate, decimal GstRate)
    {
        public decimal EffectiveRate => FeeRate + GstRate;
    }

    /// <summary>
    /// One rule for turning the configured gateway percentages into what the
    /// gateway actually charges. PricingService looks a strategy up by
    /// <see cref="Mode"/>, so a new pricing rule is a new class — not an edit
    /// to the calculation.
    /// </summary>
    public interface IGatewayCostStrategy
    {
        PaymentPricingMode Mode { get; }

        GatewayCostRates Resolve(PaymentSettings settings);
    }

    /// <summary>Full fee + GST on that fee: 1.95% + 18% of 1.95% = 2.301%.</summary>
    public class StandardGatewayCostStrategy : IGatewayCostStrategy
    {
        public PaymentPricingMode Mode => PaymentPricingMode.Standard;

        public GatewayCostRates Resolve(PaymentSettings settings)
        {
            var fee = settings.GatewayFeePercent / 100m;
            return new GatewayCostRates(fee, fee * settings.GatewayGstPercent / 100m);
        }
    }

    /// <summary>Promotional pricing: gateway fee waived, GST still charged on the standard fee.</summary>
    public class CurrentOfferGatewayCostStrategy : IGatewayCostStrategy
    {
        public PaymentPricingMode Mode => PaymentPricingMode.CurrentOffer;

        public GatewayCostRates Resolve(PaymentSettings settings)
        {
            var standardFee = settings.GatewayFeePercent / 100m;
            return new GatewayCostRates(0m, standardFee * settings.GatewayGstPercent / 100m);
        }
    }

    /// <summary>Admin-defined percentages applied exactly as configured.</summary>
    public class CustomGatewayCostStrategy : IGatewayCostStrategy
    {
        public PaymentPricingMode Mode => PaymentPricingMode.Custom;

        public GatewayCostRates Resolve(PaymentSettings settings)
        {
            var fee = settings.GatewayFeePercent / 100m;
            return new GatewayCostRates(fee, fee * settings.GatewayGstPercent / 100m);
        }
    }
}
