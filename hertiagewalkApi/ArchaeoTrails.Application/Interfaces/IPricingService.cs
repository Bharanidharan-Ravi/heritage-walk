using System.Collections.Generic;
using ArchaeoTrails.Application.Features.Payments;
using ArchaeoTrails.Domain.Entities;

namespace ArchaeoTrails.Application.Interfaces
{
    /// <summary>Pure (no I/O) pricing engine. All money maths is decimal.</summary>
    public interface IPricingService
    {
        /// <summary>
        /// Works out the minimum customer price that lets ArchaeoTrails net
        /// <paramref name="baseAmount"/>, and — when a final price is supplied —
        /// validates it and reports the expected net / extra margin. Invalid
        /// input yields IsValid=false with a message rather than an exception.
        /// </summary>
        PricingCalculationResponse Calculate(decimal baseAmount, PaymentSettings settings, decimal? finalCustomerAmount = null);

        /// <summary>Customer-facing price suggestions at or above <paramref name="minimumAmount"/>.</summary>
        IReadOnlyList<SuggestedPrice> GetSuggestedPrices(decimal minimumAmount);
    }
}
