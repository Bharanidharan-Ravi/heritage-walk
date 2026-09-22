using System;
using ArchaeoTrails.Domain.Enums;

namespace ArchaeoTrails.Domain.Entities
{
    /// <summary>
    /// A single filled-in, paid instance of a FormTemplate.
    /// A row only counts as a real submission once Status == Paid, verified
    /// server-side against Razorpay's signature — never trust a client flag.
    /// </summary>
    public class FormSubmission
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public Guid FormTemplateId { get; set; }
        public FormTemplate? FormTemplate { get; set; }

        /// <summary>JSON object of the filled-in field values, keyed by field name.</summary>
        public string DataJson { get; set; } = "{}";

        public string? SubmitterName { get; set; }

        /// <summary>Where the "thanks, you're in" confirmation email is sent.</summary>
        public string? SubmitterEmail { get; set; }

        public decimal AmountPaid { get; set; }
        public string Currency { get; set; } = "INR";

        public string RazorpayOrderId { get; set; } = string.Empty;
        public string? RazorpayPaymentId { get; set; }

        public SubmissionStatus Status { get; set; } = SubmissionStatus.PendingPayment;

        /// <summary>
        /// The Private date this submission booked (date only, UTC midnight);
        /// null for Group bookings. A booked date is taken off the experience's
        /// public list of available Private dates.
        /// </summary>
        public DateTime? BookedSlot { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
