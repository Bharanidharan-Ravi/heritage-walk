using System;
using System.Threading.Tasks;

namespace ArchaeoTrails.Application.Interfaces
{
    /// <summary>
    /// Real-time notification boundary for the Experiences module. Azure SQL
    /// stays the source of truth for everything below — these calls only tell
    /// already-connected admin/employee clients "something changed" (or, for
    /// BookingUpdated, hand them the new counts) so the frontend's TanStack
    /// Query cache can invalidate/patch itself instead of polling.
    ///
    /// Payloads are deliberately minimal (ids + the few fields a client needs
    /// to decide what to invalidate) — never the full entity, and never
    /// anything security-sensitive (no SQL details, no other users' data).
    /// Implemented by ArchaeoTrails.Api's SignalRExperienceEventPublisher
    /// (lives in Api, not Infrastructure, because it needs the ExperienceHub
    /// type — see that file's header for why).
    /// </summary>
    public interface IExperienceEventPublisher
    {
        Task ExperienceCreatedAsync(Guid id);

        Task ExperienceUpdatedAsync(Guid id);

        /// <summary>Employee submitted an experience for approval — notifies Admins.</summary>
        Task ApprovalRequestedAsync(Guid id, Guid ownerId);

        /// <summary>Approve / Request changes / Close — notifies Admins and the owning Employee.</summary>
        Task ExperienceStatusChangedAsync(Guid id, Guid ownerId, string status, DateTime updatedAt);

        Task ExperiencePublishedAsync(Guid id, Guid ownerId, DateTime updatedAt);

        /// <summary>
        /// A capacity-limited experience's linked form received a submission
        /// (see FormsController.SubmitForm). No public "experience:{id}"
        /// group exists yet since there's no live public booking page — this
        /// currently reaches the admin group only. Add that group here,
        /// without touching the caller, once a public page subscribes.
        /// </summary>
        Task BookingUpdatedAsync(Guid experienceId, int booked, int? remaining);

        // TODO(form-generator): PaymentStatusChanged intentionally omitted —
        // Razorpay verification (RazorpayPaymentService) is still a stub, so
        // there is no real payment event to publish yet. Add a
        // PaymentStatusChangedAsync(...) method here once actual payment
        // verification exists for a paid Experience/Form flow, and publish it
        // only to the paying user + Admins (never broadcast payment status).
    }
}
