namespace ArchaeoTrails.Domain.Enums
{
    /// <summary>
    /// Decides how gateway cost is derived from the configured percentages —
    /// see the IGatewayCostStrategy implementations in the Application project.
    /// </summary>
    public enum PaymentPricingMode
    {
        /// <summary>Promotional gateway pricing: the gateway fee is waived but GST on the standard fee still applies.</summary>
        CurrentOffer = 0,

        /// <summary>Full gateway fee plus GST on that fee.</summary>
        Standard = 1,

        /// <summary>Admin-defined percentages applied as configured (fee plus GST on that fee).</summary>
        Custom = 2
    }
}
