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
        /// Composite: "group" (see <see cref="Children"/>).
        /// Agreement blocks: "terms" | "consent" (answer is "Accepted" or empty).
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

        // ---- Predefined-block extras ------------------------------------------
        // All optional. A plain block leaves every one of these null/false, and
        // they round-trip through FieldsJson untouched. They live on the DTO
        // rather than being loose JSON because CreateForm serialises THIS type
        // into FormTemplate.FieldsJson — anything not declared here would be
        // silently dropped on save.
        // See docs/form-generator/PREDEFINED_FIELDS_PLAN.md.

        /// <summary>
        /// Marks a field the rest of the system needs to find by meaning rather
        /// than by name: "submitterName" | "submitterEmail" (used for the
        /// confirmation email), or, inside a group, "pincode" | "city" | "state".
        /// </summary>
        public string? Role { get; set; }

        /// <summary>Declarative client-side rules. TODO(form-generator): not yet re-checked server-side.</summary>
        public FieldValidation? Validation { get; set; }

        /// <summary>Named built-in option list (e.g. "indiaStates") used instead of <see cref="Options"/>.</summary>
        public string? OptionsFrom { get; set; }

        /// <summary>Extra frontend behaviour, e.g. "indianAddress" for the PIN-code lookup.</summary>
        public string? Behavior { get; set; }

        /// <summary>When true, ticking <see cref="OtherLabel"/> reveals a free-text box.</summary>
        public bool AllowOther { get; set; }

        /// <summary>Which choice counts as "Other". Defaults to "Other".</summary>
        public string? OtherLabel { get; set; }

        /// <summary>Scrollable policy text for a "terms" block.</summary>
        public string? BodyText { get; set; }

        /// <summary>The sentence beside the tick box of a "terms"/"consent" block.</summary>
        public string? AcknowledgementText { get; set; }

        /// <summary>
        /// Sub-fields of a "group" block (e.g. the six parts of an address).
        /// Their answers are stored under dotted keys — "address.pincode" — so
        /// FormSubmission.DataJson stays a flat string map.
        /// </summary>
        public List<FormFieldDefinition>? Children { get; set; }
    }

    /// <summary>
    /// Constraints a predefined block carries with it. Every member is optional;
    /// the frontend applies them as native HTML validity attributes.
    /// </summary>
    public class FieldValidation
    {
        /// <summary>Regular-expression source, tested against the trimmed value.</summary>
        public string? Pattern { get; set; }

        /// <summary>Shown instead of the browser's generic wording when Pattern fails.</summary>
        public string? Message { get; set; }

        public int? MinLength { get; set; }
        public int? MaxLength { get; set; }

        /// <summary>Numeric bounds, for Type == "number".</summary>
        public decimal? Min { get; set; }
        public decimal? Max { get; set; }

        /// <summary>Strip non-digits as the user types (phone, PIN code).</summary>
        public bool DigitsOnly { get; set; }

        /// <summary>Mobile keyboard hint: "numeric" | "email" | "tel".</summary>
        public string? InputMode { get; set; }

        /// <summary>Static adornment rendered inside the input, e.g. "+91".</summary>
        public string? Prefix { get; set; }
    }

    // ---- Public: read a form's schema ------------------------------------------

    public class FormDto
    {
        public Guid Id { get; set; }
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
