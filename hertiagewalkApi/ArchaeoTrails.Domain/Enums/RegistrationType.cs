namespace ArchaeoTrails.Domain.Enums
{
    /// <summary>
    /// Which registration option(s) the public booking cart offers for an
    /// experience. Set by an Admin alongside payment/capacity (see
    /// ExperienceTemplate.RegistrationType) — most tours are Individual-only;
    /// Group is a private booking that needs its own bookable dates (see
    /// ExperienceTemplate.SlotsJson) instead of just a booking deadline.
    /// </summary>
    public enum RegistrationType
    {
        /// <summary>Only individual bookings; BookingEndDate alone gates when booking closes.</summary>
        Individual = 0,

        /// <summary>Only private/group bookings; visitor picks one of the configured slot dates.</summary>
        Group = 1,

        /// <summary>Both options offered — visitor chooses Individual or Group at booking time.</summary>
        Both = 2
    }
}
