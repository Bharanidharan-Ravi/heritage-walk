using System;
using System.Threading.Tasks;
using ArchaeoTrails.Application.Features.Payments;
using ArchaeoTrails.Application.Interfaces;
using ArchaeoTrails.Domain.Entities;

namespace ArchaeoTrails.Application.Services
{
    public class PaymentSettingsService : IPaymentSettingsService
    {
        private const decimal MaxPercent = 100m;

        private readonly IPaymentSettingsRepository _repository;

        public PaymentSettingsService(IPaymentSettingsRepository repository)
        {
            _repository = repository;
        }

        public async Task<PaymentSettings> GetCurrentEntityAsync()
        {
            // The migration seeds a default row; this is only a safety net for
            // an emptied table so the pricing endpoints never 500 on "no settings".
            return await _repository.GetCurrentAsync()
                ?? await _repository.CreateAsync(new PaymentSettings());
        }

        public async Task<PaymentSettingsDto> GetAsync() => ToDto(await GetCurrentEntityAsync());

        public async Task<PaymentSettingsResult> UpdateAsync(UpdatePaymentSettingsRequest request, Guid updatedByUserId)
        {
            var error = Validate(request);
            if (error != null) return PaymentSettingsResult.Fail(error);

            var settings = await GetCurrentEntityAsync();

            settings.Provider = request.Provider!.Value;
            settings.Environment = request.Environment!.Value;
            settings.IsEnabled = request.IsEnabled!.Value;
            settings.PlatformFeePercent = Math.Round(request.PlatformFeePercent!.Value, 2, MidpointRounding.AwayFromZero);
            settings.GatewayFeePercent = Math.Round(request.GatewayFeePercent!.Value, 2, MidpointRounding.AwayFromZero);
            settings.GatewayGstPercent = Math.Round(request.GatewayGstPercent!.Value, 2, MidpointRounding.AwayFromZero);
            settings.PricingMode = request.PricingMode!.Value;
            settings.Currency = request.Currency!.Trim().ToUpperInvariant();
            settings.UpdatedAt = DateTime.UtcNow;
            settings.UpdatedByUserId = updatedByUserId;

            await _repository.UpdateAsync(settings);
            return PaymentSettingsResult.Ok(ToDto(settings));
        }

        private static string? Validate(UpdatePaymentSettingsRequest r)
        {
            if (r.Provider is null || !Enum.IsDefined(r.Provider.Value)) return "A valid provider is required.";
            if (r.Environment is null || !Enum.IsDefined(r.Environment.Value)) return "Environment must be Sandbox or Production.";
            if (r.IsEnabled is null) return "IsEnabled is required.";
            if (r.PricingMode is null || !Enum.IsDefined(r.PricingMode.Value)) return "Pricing mode must be CurrentOffer, Standard or Custom.";

            var percentError = ValidatePercent(r.PlatformFeePercent, "Platform fee percent")
                ?? ValidatePercent(r.GatewayFeePercent, "Gateway fee percent")
                ?? ValidatePercent(r.GatewayGstPercent, "Gateway GST percent");
            if (percentError != null) return percentError;

            if (!string.Equals(r.Currency?.Trim(), PricingService.SupportedCurrency, StringComparison.OrdinalIgnoreCase))
                return $"Currency must be {PricingService.SupportedCurrency}.";

            return null;
        }

        private static string? ValidatePercent(decimal? value, string name)
        {
            if (value is null) return $"{name} is required.";
            if (value < 0m) return $"{name} cannot be negative.";
            if (value > MaxPercent) return $"{name} cannot be more than {MaxPercent}.";
            return null;
        }

        private static PaymentSettingsDto ToDto(PaymentSettings s) => new()
        {
            Id = s.Id,
            Provider = s.Provider,
            Environment = s.Environment,
            IsEnabled = s.IsEnabled,
            PlatformFeePercent = s.PlatformFeePercent,
            GatewayFeePercent = s.GatewayFeePercent,
            GatewayGstPercent = s.GatewayGstPercent,
            PricingMode = s.PricingMode,
            Currency = s.Currency,
            CreatedAt = s.CreatedAt,
            UpdatedAt = s.UpdatedAt,
            UpdatedByUserId = s.UpdatedByUserId
        };
    }
}
