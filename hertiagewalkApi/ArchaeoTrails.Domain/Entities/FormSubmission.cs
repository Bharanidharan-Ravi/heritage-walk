using System;
using ArchaeoTrails.Domain.Enums;

namespace ArchaeoTrails.Domain.Entities
{
    /// <summary>
    /// A single filled-in instance of a FormTemplate — for an Experience, this
    /// row IS the booking. A paid booking is created as PendingPayment before
    /// the visitor is sent to the gateway, and only counts once Status == Paid,
    /// confirmed server-side with the gateway — never trust a client flag.
    /// </summary>
    public class FormSubmission
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Short, human-friendly booking ID shown to the customer ("AT-7K3Q9M").
        /// Also used as the gateway's order id. Null on rows from before bookings
        /// existed.
        /// </summary>
        public string? BookingRef { get; set; }

        public Guid FormTemplateId { get; set; }
        public FormTemplate? FormTemplate { get; set; }

        /// <summary>The Experience this booking is for; null for a standalone form.</summary>
        public Guid? ExperienceTemplateId { get; set; }

        /// <summary>JSON object of the filled-in field values, keyed by field name.</summary>
        public string DataJson { get; set; } = "{}";

        public string? SubmitterName { get; set; }

        /// <summary>Where the "thanks, you're in" confirmation email is sent.</summary>
        public string? SubmitterEmail { get; set; }

        /// <summary>10-digit mobile number — Cashfree requires one on every order.</summary>
        public string? SubmitterPhone { get; set; }

        /// <summary>"Group" or "Private" — what this booking was made as.</summary>
        public string? RegistrationType { get; set; }

        /// <summary>Number of people this booking covers.</summary>
        public int Quantity { get; set; } = 1;

        /// <summary>Total charged (unit price × Quantity) — computed server-side only.</summary>
        public decimal AmountPaid { get; set; }
        public string Currency { get; set; } = "INR";

        /// <summary>"Cashfree" (or "Razorpay" on legacy rows); null for free forms.</summary>
        public string? PaymentGateway { get; set; }

        /// <summary>The gateway's order id — equals BookingRef for Cashfree orders.</summary>
        public string GatewayOrderId { get; set; } = string.Empty;

        /// <summary>The gateway's payment id, set once the payment succeeds.</summary>
        public string? GatewayPaymentId { get; set; }

        /// <summary>Cashfree payment_session_id — lets the visitor retry paying the same order.</summary>
        public string? GatewaySessionId { get; set; }

        public SubmissionStatus Status { get; set; } = SubmissionStatus.PendingPayment;

        /// <summary>
        /// The Private date this submission booked (date only, UTC midnight);
        /// null for Group bookings. A booked date is taken off the experience's
        /// public list of available Private dates.
        /// </summary>
        public DateTime? BookedSlot { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// When a PendingPayment booking stops holding its seats / date. The
        /// gateway order expires at the same moment, so it can't be paid later.
        /// </summary>
        public DateTime? ExpiresAt { get; set; }

        public DateTime? PaidAt { get; set; }
    }
}
