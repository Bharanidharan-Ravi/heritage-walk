using System;
using System.Collections.Generic;

namespace ArchaeoTrails.Application.Features.Forms
{
    // ---- Admin: create a form -------------------------------------------------

    public class CreateFormTemplateRequest
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public List<FormFieldDefinition> Fields { get; set; } = new();
        /// <summary>When false the form is free — Price/Currency are ignored.</summary>
        public bool RequiresPayment { get; set; } = true;
        public decimal Price { get; set; }
        public string Currency { get; set; } = "INR";
    }

    public class FormFieldDefinition
    {
        /// <summary>Stable id assigned by the builder; used as the React key and drag id.</summary>
        public string Id { get; set; } = string.Empty;

        /// <summary>Key the answer is stored under in FormSubmission.DataJson.</summary>
        public string Name { get; set; } = string.Empty;

        public string Label { get; set; } = string.Empty;

        /// <summary>
        /// Input types: "text" | "email" | "phone" | "number" | "textarea" |
        /// "select" | "radio" | "checkbox" | "date" | "time".
        /// Display-only blocks (no answer collected): "heading" | "paragraph" | "divider".
        /// </summary>
        public string Type { get; set; } = "text";

        public bool Required { get; set; }

        public string Placeholder { get; set; } = string.Empty;

        /// <summary>Small hint rendered under the input.</summary>
        public string HelpText { get; set; } = string.Empty;

        /// <summary>Choices for "select" | "radio" | "checkbox"; ignored otherwise.</summary>
        public List<string> Options { get; set; } = new();

        /// <summary>
        /// Span in a 12-column grid: 12 = full row, 6 = half, 4 = third, 3 = quarter.
        /// Consecutive fields whose widths sum to 12 share a row, which is how the
        /// builder does left/right side-by-side layout.
        /// </summary>
        public int Width { get; set; } = 12;
    }

    // ---- Public: read a form's schema ------------------------------------------

    public class FormDto
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public List<FormFieldDefinition> Fields { get; set; } = new();
        public bool RequiresPayment { get; set; }
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
        // All three stay empty for a form with RequiresPayment == false.
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

    // ---- Admin/Employee: dashboard views ----------------------------------------

    public class AdminFormListItemDto
    {
        public Guid Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public bool RequiresPayment { get; set; }
        public decimal Price { get; set; }
        public string Currency { get; set; } = "INR";
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public int SubmissionCount { get; set; }
    }

    public class UpdateFormStatusRequest
    {
        public bool IsActive { get; set; }
    }

    public class AdminFormSubmissionDto
    {
        public Guid Id { get; set; }
        public Dictionary<string, string> FormData { get; set; } = new();
        public string? SubmitterName { get; set; }
        public string? SubmitterEmail { get; set; }
        public decimal AmountPaid { get; set; }
        public string Currency { get; set; } = "INR";
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}
