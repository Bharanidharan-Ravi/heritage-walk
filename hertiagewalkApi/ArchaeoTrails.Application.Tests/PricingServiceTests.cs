using System.Linq;
using ArchaeoTrails.Application.Features.Payments;
using ArchaeoTrails.Application.Services;
using ArchaeoTrails.Domain.Entities;
using ArchaeoTrails.Domain.Enums;

namespace ArchaeoTrails.Application.Tests
{
    public class PricingServiceTests
    {
        private readonly PricingService _pricing = PricingService.CreateDefault();

        // "Standard Cashfree pricing": 1.95% fee + 18% GST on the fee = 2.301%.
        private static PaymentSettings Standard(
            decimal platform = 5m, decimal gateway = 1.95m, decimal gst = 18m) => new()
        {
            PlatformFeePercent = platform,
            GatewayFeePercent = gateway,
            GatewayGstPercent = gst,
            PricingMode = PaymentPricingMode.Standard,
            Currency = "INR"
        };

        [Fact]
        public void Test01_Standard_5PercentPlatform_MinimumIs1079()
        {
            var r = _pricing.Calculate(1000m, Standard());

            Assert.True(r.IsValid);
            Assert.Equal(1079m, r.MinimumCustomerAmount);
            Assert.Null(r.CustomerAmount);
        }

        [Fact]
        public void Test02_HigherPlatformFee_IncreasesMinimum()
        {
            var at5 = _pricing.Calculate(1000m, Standard(platform: 5m));
            var at10 = _pricing.Calculate(1000m, Standard(platform: 10m));

            Assert.Equal(1141m, at10.MinimumCustomerAmount);
            Assert.True(at10.MinimumCustomerAmount > at5.MinimumCustomerAmount);
        }

        [Fact]
        public void Test03_CustomerPrice1099_IsValid_WithNetAndMargin()
        {
            var r = _pricing.Calculate(1000m, Standard(), 1099m);

            Assert.True(r.IsValid);
            Assert.Null(r.ValidationMessage);
            Assert.Equal(1099m, r.CustomerAmount);
            Assert.Equal(1079m, r.MinimumCustomerAmount);
            Assert.Equal(54.95m, r.PlatformFeeAmount);
            Assert.Equal(21.43m, r.GatewayFeeAmount);
            Assert.Equal(3.86m, r.GatewayGstAmount);
            Assert.Equal(1018.76m, r.ExpectedNetAmount);
            Assert.Equal(18.76m, r.AdditionalMargin);
        }

        [Fact]
        public void Test04_CustomerPriceBelowMinimum_IsInvalid()
        {
            var r = _pricing.Calculate(1000m, Standard(), 1050m);

            Assert.False(r.IsValid);
            Assert.Equal(
                "Customer price cannot be lower than the minimum required price of ₹1,079.",
                r.ValidationMessage);
            Assert.Equal(1079m, r.MinimumCustomerAmount);
        }

        [Fact]
        public void Test05_ZeroPlatformFee()
        {
            var r = _pricing.Calculate(1000m, Standard(platform: 0m));

            Assert.True(r.IsValid);
            Assert.Equal(0m, r.PlatformFeeAmount);
            Assert.Equal(1024m, r.MinimumCustomerAmount); // 1000 / 0.97699
        }

        [Fact]
        public void Test06_ZeroGatewayFee()
        {
            var r = _pricing.Calculate(1000m, Standard(gateway: 0m));

            Assert.True(r.IsValid);
            Assert.Equal(0m, r.GatewayFeeAmount);
            Assert.Equal(0m, r.GatewayGstAmount);
            Assert.Equal(1053m, r.MinimumCustomerAmount); // 1000 / 0.95
        }

        [Fact]
        public void Test07_ZeroGst()
        {
            var r = _pricing.Calculate(1000m, Standard(gst: 0m));

            Assert.True(r.IsValid);
            Assert.Equal(0m, r.GatewayGstAmount);
            Assert.Equal(1075m, r.MinimumCustomerAmount); // 1000 / 0.9305
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-100)]
        public void Test08_NonPositiveBaseAmount_Fails(int baseAmount)
        {
            var r = _pricing.Calculate(baseAmount, Standard());

            Assert.False(r.IsValid);
            Assert.Equal("Base amount must be greater than zero.", r.ValidationMessage);
        }

        [Fact]
        public void Test09_NegativePlatformFee_Fails()
        {
            var r = _pricing.Calculate(1000m, Standard(platform: -1m));

            Assert.False(r.IsValid);
            Assert.Equal("Platform fee percent cannot be negative.", r.ValidationMessage);
        }

        [Fact]
        public void NegativeGatewayFeeOrGst_Fails()
        {
            Assert.False(_pricing.Calculate(1000m, Standard(gateway: -0.1m)).IsValid);
            Assert.False(_pricing.Calculate(1000m, Standard(gst: -1m)).IsValid);
        }

        [Fact]
        public void CurrentOffer_WaivesGatewayFee_ButKeepsGstOnStandardFee()
        {
            var settings = Standard();
            settings.PricingMode = PaymentPricingMode.CurrentOffer;

            var r = _pricing.Calculate(1000m, settings);

            Assert.True(r.IsValid);
            Assert.Equal(0m, r.GatewayFeeAmount);
            Assert.True(r.GatewayGstAmount > 0m);
            Assert.Equal(1057m, r.MinimumCustomerAmount); // 1000 / (1 - 0.05 - 0.00351)
        }

        [Fact]
        public void CustomerPriceEqualToMinimum_IsValid()
        {
            var r = _pricing.Calculate(1000m, Standard(), 1079m);

            Assert.True(r.IsValid);
            Assert.True(r.AdditionalMargin >= 0m);
            Assert.True(r.ExpectedNetAmount >= 1000m);
        }

        [Fact]
        public void FeesConsumingWholePrice_Fails()
        {
            var r = _pricing.Calculate(1000m, Standard(platform: 100m));

            Assert.False(r.IsValid);
        }

        [Fact]
        public void UnsupportedCurrency_Fails()
        {
            var settings = Standard();
            settings.Currency = "USD";

            Assert.False(_pricing.Calculate(1000m, settings).IsValid);
        }

        [Fact]
        public void SuggestedPrices_For1079()
        {
            var s = _pricing.GetSuggestedPrices(1079m);

            Assert.Equal(new[] { 1079m, 1080m, 1099m, 1149m }, s.Select(x => x.Amount));
            Assert.Equal(
                new[] { PriceSuggestionStrategy.Exact, PriceSuggestionStrategy.Rounded, PriceSuggestionStrategy.Attractive, PriceSuggestionStrategy.Premium },
                s.Select(x => x.Strategy));
        }

        [Fact]
        public void SuggestedPrices_AreNeverBelowMinimum_AndHaveNoDuplicates()
        {
            foreach (var min in new[] { 79m, 990m, 1000m, 1099m, 1100m, 5999m })
            {
                var s = _pricing.GetSuggestedPrices(min);

                Assert.All(s, x => Assert.True(x.Amount >= min));
                Assert.Equal(s.Count, s.Select(x => x.Amount).Distinct().Count());
                Assert.Equal(min, s.First().Amount);
            }
        }

        [Fact]
        public void EveryMinimum_ActuallyNetsAtLeastBaseAmount()
        {
            foreach (var baseAmount in new[] { 1m, 99m, 250m, 999m, 1234.56m, 10000m, 49999m })
            {
                var r = _pricing.Calculate(baseAmount, Standard());

                Assert.True(r.IsValid);
                Assert.True(r.ExpectedNetAmount >= baseAmount, $"base {baseAmount}: net {r.ExpectedNetAmount}");
            }
        }
    }
}
