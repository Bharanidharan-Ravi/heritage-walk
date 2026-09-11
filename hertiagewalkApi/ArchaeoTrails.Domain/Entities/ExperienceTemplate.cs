using System;
using ArchaeoTrails.Domain.Enums;

namespace ArchaeoTrails.Domain.Entities
{
    /// <summary>
    /// One Walk / Seminar / Course (or a future experience type) built with the
    /// Experience Builder. Azure SQL is the authoritative workflow/business
    /// record; Sanity holds the editorial/public-presentation copy of the same
    /// content — see <see cref="SanityDocumentId"/> and <see cref="SanitySyncStatus"/>.
    ///
    /// Booking reuses the existing Form Generator rather than a bespoke
    /// registration engine: <see cref="LinkedFormTemplateId"/> points at the one
    /// FormTemplate collecting registrations for this experience.
    /// </summary>
    public class ExperienceTemplate
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public ExperienceType Type { get; set; }

        public ExperienceStatus Status { get; set; } = ExperienceStatus.Draft;

        public string Title { get; set; } = string.Empty;

        /// <summary>
        /// JSON array of content blocks from the Experience Builder — the
        /// dynamic, per-type fields (description, gallery, itinerary, FAQ,
        /// modules, ...). Deliberately NOT normalized into SQL columns; see
        /// Config/experienceBuilder.config.jsx on the frontend for the block
        /// shapes this can contain.
        /// </summary>
        public string ContentBlocksJson { get; set; } = "[]";

        /// <summary>Id of the mirrored draft/published document in Sanity, once one exists.</summary>
        public string? SanityDocumentId { get; set; }

        public SanitySyncStatus SanitySyncStatus { get; set; } = SanitySyncStatus.NotSynced;
        public string? LastSyncError { get; set; }
        public DateTime? LastSyncedAt { get; set; }

        // ---- Admin-controlled payment/capacity (spec: Employee never sets these) ----

        public bool RequiresPayment { get; set; }
        public decimal Price { get; set; }
        public string Currency { get; set; } = "INR";

        /// <summary>Total seats; null = unlimited.</summary>
        public int? CapacityTotal { get; set; }

        /// <summary>
        /// Seats left, decremented atomically by the concurrency-safe capacity
        /// check in EfFormSubmissionRepository.TryCreateWithCapacityAsync. Kept
        /// in sync with CapacityTotal whenever an Admin changes capacity via
        /// PUT /api/experiences/{id}/payment. Null whenever CapacityTotal is null.
        /// </summary>
        public int? CapacityRemaining { get; set; }

        /// <summary>The registration form for this experience — reuses the existing Form Generator.</summary>
        public Guid? LinkedFormTemplateId { get; set; }

        // ---- Schedule ----

        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }

        /// <summary>Deadline after which the linked form stops accepting new bookings. Separate from EndDate.</summary>
        public DateTime? BookingEndDate { get; set; }

        // ---- Workflow bookkeeping ----

        public Guid CreatedByUserId { get; set; }
        public Guid? ApprovedByUserId { get; set; }

        /// <summary>Why an Admin sent it back for edits. Cleared on the next submit.</summary>
        public string? ChangesRequestedReason { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ApprovedAt { get; set; }
        public DateTime? PublishedAt { get; set; }
        public DateTime? ClosedAt { get; set; }
    }
}
