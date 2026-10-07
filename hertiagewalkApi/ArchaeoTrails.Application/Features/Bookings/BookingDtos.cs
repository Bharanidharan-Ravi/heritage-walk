using System;
using System.Collections.Generic;

namespace ArchaeoTrails.Application.Features.Bookings
{
    /// <summary>
    /// POST /api/bookings — "Pay Now". Deliberately has NO amount: the price is
    /// read from the Experience in the database and multiplied server-side.
    /// </summary>
    public class CreateBookingRequest
    {
        public Guid ExperienceId { get; set; }

        /// <summary>"Group" or "Private" — the cart's choice.</summary>
        public string RegistrationType { get; set; } = "Group";

        /// <summary>Number of people — the cart's choice.</summary>
        public int Quantity { get; set; } = 1;

        /// <summary>ISO date of the chosen Private slot; empty for Group.</summary>
        public string? Slot { get; set; }

        public Dictionary<string, string> FormData { get; set; } = new();

        public string? SubmitterName { get; set; }
        public string? SubmitterEmail { get; set; }
        public string? SubmitterPhone { get; set; }
    }

    public class CreateBookingResponse
    {
        public string BookingRef { get; set; } = string.Empty;

        /// <summary>Pass to the Cashfree JS SDK's checkout({ paymentSessionId }).</summary>
        public string PaymentSessionId { get; set; } = string.Empty;

        /// <summary>"sandbox" or "production" — the Cashfree JS SDK's load({ mode }).</summary>
        public string Mode { get; set; } = "sandbox";

        public decimal Amount { get; set; }
        public decimal UnitPrice { get; set; }
        public int Quantity { get; set; }
        public string Currency { get; set; } = "INR";
        public DateTime ExpiresAt { get; set; }

        /// <summary>
        /// True when this visitor's earlier attempt (page reloaded mid-checkout)
        /// turned out to be paid already — no new order was made; BookingRef is
        /// that paid booking and the frontend goes straight to /booking/{ref}.
        /// </summary>
        public bool AlreadyPaid { get; set; }
    }

    /// <summary>What the booking confirmation emails show (visitor + site owner).</summary>
    public class BookingConfirmationEmail
    {
        public string BookingRef { get; set; } = string.Empty;
        public string ExperienceTitle { get; set; } = string.Empty;
        public DateTime? ExperienceDate { get; set; }
        public string? RegistrationType { get; set; }
        public int Quantity { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "INR";
        public string? SubmitterName { get; set; }
        public string? SubmitterEmail { get; set; }
        public string? SubmitterPhone { get; set; }
        public DateTime PaidAt { get; set; }

        /// <summary>Link to the public /booking/{ref} page.</summary>
        public string? BookingUrl { get; set; }

        /// <summary>The visitor's form answers (owner email only).</summary>
        public string? DataJson { get; set; }
    }

    /// <summary>
    /// GET /api/bookings/{ref} — public, so only what the confirmation page
    /// shows. No email / phone / form answers.
    /// </summary>
    public class BookingStatusDto
    {
        public string BookingRef { get; set; } = string.Empty;

        /// <summary>PendingPayment | Paid | Failed | Submitted | Expired.</summary>
        public string Status { get; set; } = string.Empty;

        /// <summary>Live gateway order status while pending (ACTIVE / PAID / EXPIRED …); null otherwise.</summary>
        public string? GatewayStatus { get; set; }

        public Guid? ExperienceId { get; set; }
        public string? ExperienceTitle { get; set; }
        public string? RegistrationType { get; set; }
        public int Quantity { get; set; }
        public DateTime? BookedSlot { get; set; }
        public DateTime? ExperienceDate { get; set; }
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "INR";
        public string? SubmitterFirstName { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ExpiresAt { get; set; }
        public DateTime? PaidAt { get; set; }
    }

    /// <summary>What happened to a gateway webhook — the controller maps it to an HTTP status.</summary>
    public class WebhookResult
    {
        public WebhookOutcome Outcome { get; set; }
        public string? OrderId { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    public enum WebhookOutcome
    {
        /// <summary>Done (or deliberately ignored) — answer 200 so the gateway stops sending it.</summary>
        Handled = 0,

        /// <summary>Not signed with our key — rejected, nothing stored.</summary>
        InvalidSignature = 1,

        /// <summary>Couldn't check the order right now — answer 5xx so the gateway sends it again.</summary>
        RetryLater = 2
    }

    /// <summary>Outcome of IBookingService calls — the controller maps it to an HTTP status.</summary>
    public class BookingResult<T>
    {
        public bool Success { get; set; }
        public T? Value { get; set; }
        public string? Message { get; set; }
        public BookingError Error { get; set; }

        public static BookingResult<T> Ok(T value) => new() { Success = true, Value = value };
        public static BookingResult<T> Fail(BookingError error, string message) =>
            new() { Success = false, Error = error, Message = message };
    }

    public enum BookingError
    {
        None = 0,
        NotFound = 1,
        Invalid = 2,

        /// <summary>Sold out / date taken / booking closed.</summary>
        Unavailable = 3,

        /// <summary>The gateway refused or couldn't be reached.</summary>
        Gateway = 4
    }
}
