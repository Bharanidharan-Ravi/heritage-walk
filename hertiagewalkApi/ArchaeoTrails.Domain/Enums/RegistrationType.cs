namespace ArchaeoTrails.Domain.Enums
{
    /// <summary>
    /// Which registration option(s) the public booking cart offers for an
    /// experience. Set by an Admin alongside payment/capacity (see
    /// ExperienceTemplate.RegistrationType). Group is the normal open booking
    /// (any number of people, optionally against one of several group slots —
    /// ExperienceTemplate.SlotsJson). Private is a private booking with its own
    /// dates (PrivateSlotsJson) and a minimum party size (PrivateMinPeople);
    /// the visitor must pick one of those dates before booking unlocks.
    /// </summary>
    public enum RegistrationType
    {
        /// <summary>Only group bookings. Was "Individual" — the stored value (0) is unchanged.</summary>
        Group = 0,

        /// <summary>Only private bookings; visitor must pick one of the configured slot dates before booking.</summary>
        Private = 1,

        /// <summary>Both options offered — visitor chooses Group or Private at booking time.</summary>
        Both = 2
    }
}
