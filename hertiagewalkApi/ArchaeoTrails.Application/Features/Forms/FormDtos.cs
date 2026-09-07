using System;
using System.Collections.Generic;

namespace ArchaeoTrails.Application.Features.Forms
{
    // ---- Admin: create a form -------------------------------------------------

    public class CreateFormTemplateRequest
    {
        public string Title { get; set; } = string.Empty;
        public List<FormFieldDefinition> Fields { get; set; } = new();
        public decimal Price { get; set; }
        public string Currency { get; set; } = "INR";
    }

    public class FormFieldDefinition
    {
        public string Name { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        /// <summary>"text" | "email" | "phone" | "number" | "textarea" — extend as needed.</summary>
        public string Type { get; set; } = "text";
        public bool Required { get; set; }
    }

    // ---- Public: read a form's schema ------------------------------------------

    public class FormDto
    {
        public string Title { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public List<FormFieldDefinition> Fields { get; set; } = new();
        public decimal Price { get; set; }
        public string Currency { get; set; } = "INR";
    }

    // ---- Payment order ----------------------------------------------------------

    public class CreateOrderRequest
    {
        // Reserved for future use (e.g. a coupon code) — price is authoritative
        // from the FormTemplate server-side, never trust an amount from the client.
    }

    public class CreateOrderResponse
    {
        public string OrderId { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "INR";
        /// <summary>Public Razorpay key id, safe to expose to the frontend Checkout widget.</summary>
        public string RazorpayKeyId { get; set; } = string.Empty;
    }

    // ---- Submit (pay + save) -----------------------------------------------------

    public class SubmitFormRequest
    {
        public Dictionary<string, string> FormData { get; set; } = new();
        public string SubmitterName { get; set; } = string.Empty;
        public string SubmitterEmail { get; set; } = string.Empty;

        // Returned by Razorpay Checkout after a successful payment.
        public string RazorpayOrderId { get; set; } = string.Empty;
        public string RazorpayPaymentId { get; set; } = string.Empty;
        public string RazorpaySignature { get; set; } = string.Empty;
    }

    public class SubmitFormResponse
    {
        public bool Success { get; set; }
        public Guid? SubmissionId { get; set; }
        public string? Message { get; set; }
    }
}
