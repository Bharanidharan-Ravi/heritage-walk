using System;
using System.Collections.Generic;

namespace ArchaeoTrails.Application.Features.Experiences
{
    // ---- Employee/Admin: create ------------------------------------------------

    public class CreateExperienceRequest
    {
        /// <summary>"Walk" | "Seminar" | "Course" (case-insensitive).</summary>
        public string Type { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;

        /// <summary>Content blocks from the Experience Builder, as opaque JSON-able objects.</summary>
        public List<object> ContentBlocks { get; set; } = new();

        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public DateTime? BookingEndDate { get; set; }
    }

    // ---- Employee/Admin: edit content (owner-in-Draft/ChangesRequested, or Admin) ----

    public class UpdateExperienceRequest
    {
        public string Title { get; set; } = string.Empty;
        public List<object> ContentBlocks { get; set; } = new();
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public DateTime? BookingEndDate { get; set; }
    }

    // ---- Admin-only: payment/capacity/booking-form configuration ---------------

    public class SetExperiencePaymentRequest
    {
        public bool RequiresPayment { get; set; }
        public decimal Price { get; set; }
        public string Currency { get; set; } = "INR";

        /// <summary>Null = unlimited capacity.</summary>
        public int? CapacityTotal { get; set; }

        public Guid? LinkedFormTemplateId { get; set; }

        /// <summary>"Group" | "Private" | "Both" (case-insensitive; the legacy "Individual" is read as Group).</summary>
        public string RegistrationType { get; set; } = "Group";

        /// <summary>Bookable dates for Group registration — optional, ignored when RegistrationType is Private.</summary>
        public List<DateTime> Slots { get; set; } = new();

        /// <summary>Bookable dates for Private registration — required when Private is offered.</summary>
        public List<DateTime> PrivateSlots { get; set; } = new();

        /// <summary>Minimum party size for a Private booking (at least 1).</summary>
        public int PrivateMinPeople { get; set; } = 1;
    }

    public class RequestChangesRequest
    {
        public string Reason { get; set; } = string.Empty;
    }

    // ---- List (management page) -------------------------------------------------

    public class ExperienceListItemDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Type { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;

        public bool RequiresPayment { get; set; }
        public decimal Price { get; set; }
        public string Currency { get; set; } = "INR";

        /// <summary>Confirmed bookings, derived from CapacityTotal - CapacityRemaining (never a naive live COUNT).</summary>
        public int BookingConfirmed { get; set; }
        /// <summary>Null = unlimited.</summary>
        public int? CapacityTotal { get; set; }
        public bool BookingEnabled { get; set; }

        // Carried through (not edited) by SetPaymentModal on this list page —
        // it PUTs the whole SetExperiencePaymentRequest, so these need to come
        // back with the row or a price-only save from there would silently
        // reset registration type/slots to the default.
        public string RegistrationType { get; set; } = "Group";
        public List<DateTime> Slots { get; set; } = new();
        public List<DateTime> PrivateSlots { get; set; } = new();
        public int PrivateMinPeople { get; set; } = 1;

        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public DateTime? BookingEndDate { get; set; }

        public Guid CreatedByUserId { get; set; }
        public string CreatedByName { get; set; } = string.Empty;
        public DateTime UpdatedAt { get; set; }
    }

    public class PagedResult<T>
    {
        public List<T> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
    }

    // ---- Detail (builder) --------------------------------------------------------

    public class ExperienceDetailDto
    {
        public Guid Id { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public List<object> ContentBlocks { get; set; } = new();

        public bool RequiresPayment { get; set; }
        public decimal Price { get; set; }
        public string Currency { get; set; } = "INR";
        public int? CapacityTotal { get; set; }
        public int? CapacityRemaining { get; set; }
        public Guid? LinkedFormTemplateId { get; set; }
        public string RegistrationType { get; set; } = "Group";
        public List<DateTime> Slots { get; set; } = new();
        public List<DateTime> PrivateSlots { get; set; } = new();
        public int PrivateMinPeople { get; set; } = 1;

        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public DateTime? BookingEndDate { get; set; }

        public Guid CreatedByUserId { get; set; }
        public string CreatedByName { get; set; } = string.Empty;
        public string? ChangesRequestedReason { get; set; }

        public string SanitySyncStatus { get; set; } = string.Empty;
        public string? LastSyncError { get; set; }
        public DateTime? LastSyncedAt { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class ExperienceOperationResult
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
    }

    // ---- Image upload (hero/gallery drop-zones) --------------------------------
    // Response for POST /api/experiences/assets/image — Url is what actually gets
    // stored on the imageUrl/gallery content block, same shape a hand-typed url
    // used to be.

    public class ImageAssetDto
    {
        public string Url { get; set; } = string.Empty;
        public string AssetId { get; set; } = string.Empty;
    }

    // ---- Public (anonymous, Published-only) --------------------------------
    // Consumed by the public marketing site's Experience listing/detail pages
    // (see ExperienceDetail.jsx / ExperienceList.jsx). ContentBlocks is handed
    // through as-is, same as ExperienceDetailDto — the frontend's
    // experienceBuilder.config.jsx is still the only place block SHAPES are
    // known, so this stays as block-agnostic as the authenticated DTOs.

    public class PublicExperienceListItemDto
    {
        public Guid Id { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public List<object> ContentBlocks { get; set; } = new();

        public bool RequiresPayment { get; set; }
        public decimal Price { get; set; }
        public string Currency { get; set; } = "INR";

        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
    }

    public class PublicExperienceDetailDto
    {
        public Guid Id { get; set; }
        public string Type { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public List<object> ContentBlocks { get; set; } = new();

        public bool RequiresPayment { get; set; }
        public decimal Price { get; set; }
        public string Currency { get; set; } = "INR";
        public int? CapacityTotal { get; set; }
        public int? CapacityRemaining { get; set; }

        /// <summary>"Group" | "Private" | "Both" — which option(s) the cart offers.</summary>
        public string RegistrationType { get; set; } = "Group";
        /// <summary>Bookable dates for Group registration; may be empty (then only the booking deadline gates it).</summary>
        public List<DateTime> Slots { get; set; } = new();
        /// <summary>Bookable dates for Private registration; empty when Private isn't offered.</summary>
        public List<DateTime> PrivateSlots { get; set; } = new();
        /// <summary>Smallest party a Private booking accepts.</summary>
        public int PrivateMinPeople { get; set; } = 1;

        /// <summary>true once a registration form is linked and still accepting bookings (not past BookingEndDate, seats left).</summary>
        public bool BookingEnabled { get; set; }
        /// <summary>Slug of the linked registration form — the public site links "Book Now" to /forms/{slug}.</summary>
        public string? LinkedFormSlug { get; set; }

        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public DateTime? BookingEndDate { get; set; }
    }
}
