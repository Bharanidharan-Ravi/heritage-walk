using System;
using ArchaeoTrails.Domain.Enums;

namespace ArchaeoTrails.Domain.Entities
{
    /// <summary>
    /// Application-wide payment/pricing configuration. Normally exactly ONE row
    /// exists. Gateway credentials (Cashfree App ID / Secret Key) are
    /// deliberately NOT stored here — they come from user-secrets / Azure App
    /// Service configuration.
    /// </summary>
    public class PaymentSettings
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public PaymentProvider Provider { get; set; } = PaymentProvider.Cashfree;

        public PaymentEnvironment Environment { get; set; } = PaymentEnvironment.Sandbox;

        public bool IsEnabled { get; set; } = true;

        /// <summary>ArchaeoTrails' own service fee, percent of the customer amount (e.g. 5.00 = 5%).</summary>
        public decimal PlatformFeePercent { get; set; } = 5.00m;

        /// <summary>Standard gateway fee, percent of the customer amount.</summary>
        public decimal GatewayFeePercent { get; set; } = 1.95m;

        /// <summary>GST percent charged on the gateway fee.</summary>
        public decimal GatewayGstPercent { get; set; } = 18.00m;

        public PaymentPricingMode PricingMode { get; set; } = PaymentPricingMode.CurrentOffer;

        public string Currency { get; set; } = "INR";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>Admin who last changed the settings (null for the seeded row).</summary>
        public Guid? UpdatedByUserId { get; set; }
    }
}
