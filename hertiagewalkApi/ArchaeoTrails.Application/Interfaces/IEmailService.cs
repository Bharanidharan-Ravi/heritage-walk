using ArchaeoTrails.Application.Features.Contact;
using ArchaeoTrails.Domain.Entities;
using System.Threading.Tasks;

namespace ArchaeoTrails.Application.Interfaces
{
    public interface IEmailService
    {
        Task<bool> SendContactEmailAsync(ContactRequest request);

        // TODO(form-generator): implemented as stubs in ZohoEmailService until
        // real HTML templates are written — see docs/form-generator/MASTER_PROMPT.md §6.

        /// <summary>Notifies the site owner that a paid submission came in.</summary>
        Task<bool> SendFormSubmissionOwnerEmailAsync(FormTemplate form, FormSubmission submission);

        /// <summary>Confirms to the person who filled the form that payment + submission succeeded.</summary>
        Task<bool> SendFormSubmissionConfirmationEmailAsync(FormTemplate form, FormSubmission submission);
    }
}
