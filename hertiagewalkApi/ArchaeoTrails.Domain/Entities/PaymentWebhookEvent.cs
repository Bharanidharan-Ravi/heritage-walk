using System;

namespace ArchaeoTrails.Domain.Entities
{
    /// <summary>
    /// One signature-verified gateway webhook, stored raw before it's acted on —
    /// the audit trail for "I paid but got nothing". Webhooks that fail the
    /// signature check are only logged, never stored, so anyone can't fill the
    /// table by posting to the public URL.
    /// </summary>
    public class PaymentWebhookEvent
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>"Cashfree".</summary>
        public string Gateway { get; set; } = string.Empty;

        /// <summary>The gateway's event type, e.g. PAYMENT_SUCCESS_WEBHOOK.</summary>
        public string? EventType { get; set; }

        /// <summary>The order the event is about — our BookingRef for Cashfree.</summary>
        public string? GatewayOrderId { get; set; }

        public string RawBody { get; set; } = string.Empty;

        public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;

        /// <summary>Set once the event has been handled; null if handling threw.</summary>
        public DateTime? ProcessedAt { get; set; }

        /// <summary>What handling did ("confirmed", "already paid", "unknown order", …).</summary>
        public string? Outcome { get; set; }
    }
}
