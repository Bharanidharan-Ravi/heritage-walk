namespace ArchaeoTrails.Domain.Enums
{
    /// <summary>
    /// Workflow state of an ExperienceTemplate. See docs/form-generator/
    /// MASTER_PROMPT.md-style spec for the Experiences module for the full
    /// Employee -> Admin approval flow.
    ///
    /// The admin panel's three tabs (Pending / Active / Closed) are DERIVED
    /// from this plus the schedule dates, never stored as their own column:
    ///   Pending  = Draft, ChangesRequested, AwaitingApproval, Approved
    ///   Active   = Published AND (EndDate is null OR EndDate is in the future)
    ///   Closed   = Closed, OR Published AND EndDate has passed
    /// "Upcoming" vs "Live" within Active, similarly, is StartDate compared to
    /// now — not a stored value.
    /// </summary>
    public enum ExperienceStatus
    {
        Draft = 0,

        /// <summary>Admin sent it back to the employee with a reason attached.</summary>
        ChangesRequested = 1,

        /// <summary>Employee submitted it; waiting on an Admin decision.</summary>
        AwaitingApproval = 2,

        /// <summary>
        /// Admin approved the content. Sits here — still under the Pending tab,
        /// badge APPROVED — until an Admin sets payment/capacity and Publishes.
        /// </summary>
        Approved = 3,

        /// <summary>Live/public. Displays as Upcoming or Live depending on StartDate.</summary>
        Published = 4,

        /// <summary>Manually closed by an Admin, or auto-treated as closed once EndDate passes.</summary>
        Closed = 5
    }
}
