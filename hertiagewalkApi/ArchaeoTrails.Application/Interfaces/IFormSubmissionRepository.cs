using System.Threading.Tasks;
using ArchaeoTrails.Domain.Entities;

namespace ArchaeoTrails.Application.Interfaces
{
    public interface IFormSubmissionRepository
    {
        Task<FormSubmission> CreateAsync(FormSubmission submission);
        Task<FormSubmission?> GetByRazorpayOrderIdAsync(string razorpayOrderId);
        Task UpdateAsync(FormSubmission submission);
    }
}
