using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using ArchaeoTrails.Application.Features.Payments;
using ArchaeoTrails.Application.Interfaces;
using ArchaeoTrails.Application.Services.Pricing;
using ArchaeoTrails.Domain.Entities;
using ArchaeoTrails.Domain.Enums;

namespace ArchaeoTrails.Application.Services
{
    /// <summary>
    /// Minimum customer price = BaseAmount / (1 - platformRate - gatewayEffectiveRate),
    /// rounded UP to a whole rupee. The gateway part comes from the
    /// IGatewayCostStrategy matching settings.PricingMode.
    /// </summary>
    public class PricingService : IPricingService
    {
        public const string SupportedCurrency = "INR";

        // Prices are shown in rupees but fee lines are computed to the paisa.
        private const int MoneyDecimals = 2;

        private readonly IReadOnlyDictionary<PaymentPricingMode, IGatewayCostStrategy> _strategies;

        public PricingService(IEnumerable<IGatewayCostStrategy> strategies)
        {
            _strategies = strategies.ToDictionary(s => s.Mode);
        }

        /// <summary>Built-in strategies, for callers not using DI (tests).</summary>
        public static PricingService CreateDefault() => new(new IGatewayCostStrategy[]
        {
            new StandardGatewayCostStrategy(),
            new CurrentOfferGatewayCostStrategy(),
            new CustomGatewayCostStrategy()
        });

        public PricingCalculationResponse Calculate(decimal baseAmount, PaymentSettings settings, decimal? finalCustomerAmount = null)
        {
            var response = new PricingCalculationResponse
            {
                BaseAmount = baseAmount,
                PlatformFeePercent = settings.PlatformFeePercent,
                GatewayFeePercent = settings.GatewayFeePercent,
                GatewayGstPercent = settings.GatewayGstPercent,
                Currency = settings.Currency,
                PricingMode = settings.PricingMode,
                PaymentEnvironment = settings.Environment
            };

            var error = ValidateInputs(baseAmount, settings, out var gateway);
            if (error != null)
            {
                response.IsValid = false;
                response.ValidationMessage = error;
                return response;
            }

            var platformRate = settings.PlatformFeePercent / 100m;
            var retainedRate = 1m - platformRate - gateway.EffectiveRate;
            if (retainedRate <= 0m)
            {
                response.IsValid = false;
                response.ValidationMessage = "Platform and gateway fees add up to 100% or more, so no price can cover the base amount.";
                return response;
            }

            var minimum = Math.Ceiling(baseAmount / retainedRate);
            // Fee lines are rounded to the paisa, so on rare inputs the exact
            // ceiling can land a paisa short of the base amount — nudge up.
            while (BuildBreakdown(minimum, platformRate, gateway).Net < baseAmount)
            {
                minimum += 1m;
            }

            response.MinimumCustomerAmount = minimum;
            response.SuggestedPrices = GetSuggestedPrices(minimum);
            response.CustomerAmount = finalCustomerAmount;

            if (finalCustomerAmount.HasValue && finalCustomerAmount.Value < minimum)
            {
                response.IsValid = false;
                response.ValidationMessage = string.Format(CultureInfo.InvariantCulture,
                    "Customer price cannot be lower than the minimum required price of ₹{0:N0}.", minimum);
                ApplyBreakdown(response, BuildBreakdown(finalCustomerAmount.Value, platformRate, gateway), baseAmount);
                return response;
            }

            response.IsValid = true;
            ApplyBreakdown(response, BuildBreakdown(finalCustomerAmount ?? minimum, platformRate, gateway), baseAmount);
            return response;
        }

        public IReadOnlyList<SuggestedPrice> GetSuggestedPrices(decimal minimumAmount)
        {
            var min = Math.Ceiling(minimumAmount);
            var rounded = CeilToMultiple(min, 10m);
            // Next price ending in 99 (e.g. 1079 -> 1099).
            var attractive = CeilToMultiple(min + 1m, 100m) - 1m;
            // Next price ending in 49 or 99 strictly above the attractive one (1099 -> 1149).
            var premium = attractive + 50m;

            var candidates = new[]
            {
                new SuggestedPrice { Amount = min, Strategy = PriceSuggestionStrategy.Exact, Label = "Exact Minimum" },
                new SuggestedPrice { Amount = rounded, Strategy = PriceSuggestionStrategy.Rounded, Label = "Rounded" },
                new SuggestedPrice { Amount = attractive, Strategy = PriceSuggestionStrategy.Attractive, Label = "Attractive Price" },
                new SuggestedPrice { Amount = premium, Strategy = PriceSuggestionStrategy.Premium, Label = "Premium" }
            };

            // Keep the first (most specific) label when two strategies land on the same amount.
            return candidates.GroupBy(c => c.Amount).Select(g => g.First()).ToList();
        }

        private string? ValidateInputs(decimal baseAmount, PaymentSettings settings, out GatewayCostRates gateway)
        {
            gateway = default;

            if (baseAmount <= 0m) return "Base amount must be greater than zero.";
            if (settings.PlatformFeePercent < 0m) return "Platform fee percent cannot be negative.";
            if (settings.GatewayFeePercent < 0m) return "Gateway fee percent cannot be negative.";
            if (settings.GatewayGstPercent < 0m) return "Gateway GST percent cannot be negative.";
            if (!string.Equals(settings.Currency, SupportedCurrency, StringComparison.OrdinalIgnoreCase))
                return $"Only {SupportedCurrency} is supported.";
            if (!_strategies.TryGetValue(settings.PricingMode, out var strategy))
                return $"Pricing mode '{settings.PricingMode}' is not supported.";

            gateway = strategy.Resolve(settings);
            return null;
        }

        private static (decimal Platform, decimal GatewayFee, decimal GatewayGst, decimal Net) BuildBreakdown(
            decimal customerAmount, decimal platformRate, GatewayCostRates gateway)
        {
            var platform = Money(customerAmount * platformRate);
            var fee = Money(customerAmount * gateway.FeeRate);
            var gst = Money(customerAmount * gateway.GstRate);
            return (platform, fee, gst, customerAmount - platform - fee - gst);
        }

        private static void ApplyBreakdown(
            PricingCalculationResponse response,
            (decimal Platform, decimal GatewayFee, decimal GatewayGst, decimal Net) b,
            decimal baseAmount)
        {
            response.PlatformFeeAmount = b.Platform;
            response.GatewayFeeAmount = b.GatewayFee;
            response.GatewayGstAmount = b.GatewayGst;
            response.ExpectedNetAmount = b.Net;
            response.AdditionalMargin = b.Net - baseAmount;
        }

        private static decimal Money(decimal value) => Math.Round(value, MoneyDecimals, MidpointRounding.AwayFromZero);

        private static decimal CeilToMultiple(decimal value, decimal multiple) => Math.Ceiling(value / multiple) * multiple;
    }
}
