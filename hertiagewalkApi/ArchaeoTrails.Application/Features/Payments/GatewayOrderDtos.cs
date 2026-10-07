using System;
using ArchaeoTrails.Domain.Enums;

namespace ArchaeoTrails.Application.Features.Payments
{
    /// <summary>What IPaymentGateway needs to open an order. Amount is always server-computed.</summary>
    public class GatewayOrderRequest
    {
        /// <summary>Our booking ref, reused as the gateway's order id.</summary>
        public string OrderId { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "INR";

        public string CustomerId { get; set; } = string.Empty;
        public string? CustomerName { get; set; }
        public string? CustomerEmail { get; set; }
        public string CustomerPhone { get; set; } = string.Empty;

        /// <summary>The order can't be paid after this moment.</summary>
        public DateTime ExpiresAt { get; set; }

        public string? Note { get; set; }

        public PaymentEnvironment Environment { get; set; } = PaymentEnvironment.Sandbox;
    }

    public class GatewayOrderResult
    {
        public bool Success { get; set; }

        /// <summary>Handed to the frontend checkout SDK; safe to expose.</summary>
        public string? PaymentSessionId { get; set; }

        /// <summary>The gateway's own internal order id (Cashfree cf_order_id).</summary>
        public string? GatewayReference { get; set; }

        /// <summary>Why the gateway refused, for logs / a generic error to the visitor.</summary>
        public string? Error { get; set; }
    }

    /// <summary>A gateway order's live state, read back from the gateway's API.</summary>
    public class GatewayOrderStatus
    {
        public bool Found { get; set; }

        /// <summary>Cashfree order_status: ACTIVE | PAID | EXPIRED | TERMINATED | TERMINATION_REQUESTED.</summary>
        public string Status { get; set; } = string.Empty;

        public decimal Amount { get; set; }
        public string Currency { get; set; } = string.Empty;

        public bool IsPaid => string.Equals(Status, "PAID", StringComparison.OrdinalIgnoreCase);

        public bool IsActive => string.Equals(Status, "ACTIVE", StringComparison.OrdinalIgnoreCase);

        /// <summary>
        /// The gateway couldn't be asked (not configured, down, 5xx) — the order's
        /// state is unknown, so nothing should be expired or cancelled on it yet.
        /// False on a plain "no such order".
        /// </summary>
        public bool Unavailable { get; set; }

        public string? Error { get; set; }
    }

    /// <summary>A gateway webhook, after its signature has been checked.</summary>
    public class GatewayWebhookEvent
    {
        /// <summary>
        /// Signed with our secret key. Nothing else here can be trusted when false
        /// — and even when true, a payment is only confirmed after asking the
        /// gateway's API.
        /// </summary>
        public bool SignatureValid { get; set; }

        /// <summary>e.g. PAYMENT_SUCCESS_WEBHOOK, PAYMENT_FAILED_WEBHOOK.</summary>
        public string? EventType { get; set; }

        public string? OrderId { get; set; }

        /// <summary>The gateway's payment id (Cashfree cf_payment_id), when the event has one.</summary>
        public string? PaymentId { get; set; }
    }
}
