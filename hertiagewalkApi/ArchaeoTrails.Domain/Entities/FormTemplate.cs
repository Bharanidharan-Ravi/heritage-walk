using System;
using System.Collections.Generic;

namespace ArchaeoTrails.Domain.Entities
{
    /// <summary>
    /// An admin-authored, shareable form (link + QR code) with a price attached.
    /// See docs/form-generator/MASTER_PROMPT.md for the full spec.
    /// </summary>
    public class FormTemplate
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        public string Title { get; set; } = string.Empty;

        /// <summary>Used in the public URL: /forms/{Slug}. Must be unique.</summary>
        public string Slug { get; set; } = string.Empty;

        /// <summary>
        /// JSON array of field definitions, e.g.
        /// [{"name":"fullName","label":"Full Name","type":"text","required":true}, ...]
        /// Kept as JSON (not a normalized table) intentionally — see MASTER_PROMPT.md §2.
        /// </summary>
        public string FieldsJson { get; set; } = "[]";

        /// <summary>Price in the major currency unit (e.g. rupees, not paise).</summary>
        public decimal Price { get; set; }

        public string Currency { get; set; } = "INR";

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<FormSubmission> FormSubmissions { get; set; } = new List<FormSubmission>();
    }
}
