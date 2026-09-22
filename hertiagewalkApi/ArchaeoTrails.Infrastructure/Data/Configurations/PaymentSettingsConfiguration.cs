using System;
using ArchaeoTrails.Domain.Entities;
using ArchaeoTrails.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ArchaeoTrails.Infrastructure.Data.Configurations
{
    public class PaymentSettingsConfiguration : IEntityTypeConfiguration<PaymentSettings>
    {
        /// <summary>Fixed so the seed row is identical in every environment and the migration is deterministic.</summary>
        public static readonly Guid SeedId = new("5d0f2c4e-7a1b-4c39-9e6a-3b8f1d2a4c70");

        public void Configure(EntityTypeBuilder<PaymentSettings> entity)
        {
            entity.ToTable("PaymentSettings");

            // Enums are stored as text so the table stays readable and adding a
            // gateway/mode later never depends on numeric ordering.
            entity.Property(p => p.Provider).HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(p => p.Environment).HasConversion<string>().HasMaxLength(30).IsRequired();
            entity.Property(p => p.PricingMode).HasConversion<string>().HasMaxLength(30).IsRequired();
            entity.Property(p => p.Currency).HasMaxLength(10).IsRequired();

            entity.Property(p => p.PlatformFeePercent).HasColumnType("decimal(5,2)");
            entity.Property(p => p.GatewayFeePercent).HasColumnType("decimal(5,2)");
            entity.Property(p => p.GatewayGstPercent).HasColumnType("decimal(5,2)");

            entity.Property(p => p.CreatedAt).HasColumnType("datetime2");
            entity.Property(p => p.UpdatedAt).HasColumnType("datetime2");

            // Default configuration. Admin edits it via PUT /api/admin/payment-settings.
            entity.HasData(new PaymentSettings
            {
                Id = SeedId,
                Provider = PaymentProvider.Cashfree,
                Environment = PaymentEnvironment.Sandbox,
                IsEnabled = true,
                PlatformFeePercent = 5.00m,
                GatewayFeePercent = 1.95m,
                GatewayGstPercent = 18.00m,
                PricingMode = PaymentPricingMode.CurrentOffer,
                Currency = "INR",
                CreatedAt = new DateTime(2026, 9, 20, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2026, 9, 20, 0, 0, 0, DateTimeKind.Utc),
                UpdatedByUserId = null
            });
        }
    }
}
