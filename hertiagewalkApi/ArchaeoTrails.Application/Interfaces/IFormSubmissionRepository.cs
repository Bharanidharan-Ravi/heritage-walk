using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ArchaeoTrails.Domain.Entities;

namespace ArchaeoTrails.Application.Interfaces
{
    public interface IFormSubmissionRepository
    {
        Task<FormSubmission> CreateAsync(FormSubmission submission);

        /// <summary>
        /// Used only when this submission's form is linked to a capacity-limited
        /// ExperienceTemplate (see FormsController.SubmitForm). Atomically
        /// decrements ExperienceTemplate.CapacityRemaining and inserts the
        /// submission in one transaction — returns null (no insert happened) if
        /// capacity was already exhausted. Every other form's CreateAsync path
        /// above is untouched by this — see docs Experiences module spec §20/§32.
        /// </summary>
        Task<FormSubmission?> TryCreateWithCapacityAsync(FormSubmission submission, Guid experienceTemplateId);

        /// <summary>Dates (UTC midnight) already taken by Private bookings on this form — pending-payment rows don't count.</summary>
        Task<IReadOnlyList<DateTime>> GetBookedSlotsAsync(Guid formTemplateId);

        /// <summary>
        /// PendingPayment bookings on this form whose hold hasn't run out yet —
        /// their seats and Private dates count as taken while the visitor pays.
        /// </summary>
        Task<IReadOnlyList<FormSubmission>> GetActiveHoldsAsync(Guid formTemplateId, DateTime now);

        Task<FormSubmission?> GetByBookingRefAsync(string bookingRef);
        Task<FormSubmission?> GetByGatewayOrderIdAsync(string gatewayOrderId);
        Task UpdateAsync(FormSubmission submission);

        /// <summary>
        /// PendingPayment (or Expired — a payment that landed after its hold ran
        /// out still has to count) → Paid in one conditional UPDATE (only one
        /// caller wins when the confirmation page, a webhook and the expiry
        /// worker race), and on that win takes the booking's Quantity off the
        /// experience's CapacityRemaining. Returns false if it was already paid
        /// or isn't payable.
        /// </summary>
        Task<bool> TryMarkPaidAsync(Guid submissionId, Guid? experienceTemplateId, int quantity, DateTime paidAt,
            string? gatewayPaymentId = null);

        /// <summary>
        /// PendingPayment bookings through this gateway whose hold ended before
        /// <paramref name="cutoff"/>, oldest first — the expiry worker's batch.
        /// </summary>
        Task<IReadOnlyList<FormSubmission>> GetStalePendingAsync(string gateway, DateTime cutoff, int take);

        /// <summary>PendingPayment → Expired, only if it's still pending. False if something else got there first.</summary>
        Task<bool> TryMarkExpiredAsync(Guid submissionId);

        /// <summary>Admin-only: all submissions for one form template, newest first.</summary>
        Task<IReadOnlyList<FormSubmission>> GetByTemplateIdAsync(Guid formTemplateId);
    }
}
