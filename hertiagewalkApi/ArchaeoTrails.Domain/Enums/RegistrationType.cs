namespace ArchaeoTrails.Domain.Enums
{
    /// <summary>
    /// Which registration option(s) the public booking cart offers for an
    /// experience. Set by an Admin alongside payment/capacity (see
    /// ExperienceTemplate.RegistrationType) — most tours are Individual-only;
    /// Private is a private booking that needs its own bookable dates (see
    /// ExperienceTemplate.SlotsJson) instead of just a booking deadline, and
    /// requires the visitor to pick one of those dates before booking unlocks.
    /// </summary>
    public enum RegistrationType
    {
        /// <summary>Only individual bookings; BookingEndDate alone gates when booking closes.</summary>
        Individual = 0,

        /// <summary>Only private bookings; visitor must pick one of the configured slot dates before booking.</summary>
        Private = 1,

        /// <summary>Both options offered — visitor chooses Individual or Private at booking time.</summary>
        Both = 2
    }
}
