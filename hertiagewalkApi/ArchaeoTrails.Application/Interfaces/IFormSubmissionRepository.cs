using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ArchaeoTrails.Domain.Entities;

namespace ArchaeoTrails.Application.Interfaces
{
    public interface IFormSubmissionRepository
    {
        Task<FormSubmission> CreateAsync(FormSubmission submission);

        /// <summary>
        /// Used only when this submission's form is linked to a capacity-limited
        /// ExperienceTemplate (see FormsController.SubmitForm). Atomically
        /// decrements ExperienceTemplate.CapacityRemaining and inserts the
        /// submission in one transaction — returns null (no insert happened) if
        /// capacity was already exhausted. Every other form's CreateAsync path
        /// above is untouched by this — see docs Experiences module spec §20/§32.
        /// </summary>
        Task<FormSubmission?> TryCreateWithCapacityAsync(FormSubmission submission, Guid experienceTemplateId);

        Task<FormSubmission?> GetByRazorpayOrderIdAsync(string razorpayOrderId);
        Task UpdateAsync(FormSubmission submission);

        /// <summary>Admin-only: all submissions for one form template, newest first.</summary>
        Task<IReadOnlyList<FormSubmission>> GetByTemplateIdAsync(Guid formTemplateId);
    }
}
