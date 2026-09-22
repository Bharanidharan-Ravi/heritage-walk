namespace ArchaeoTrails.Application.Features.Payments
{
    public class CalculatePriceRequest
    {
        /// <summary>The net amount ArchaeoTrails must receive.</summary>
        public decimal BaseAmount { get; set; }

        /// <summary>Optional admin-chosen customer-facing price. Must be >= the calculated minimum.</summary>
        public decimal? CustomerAmount { get; set; }
    }
}
