using System.Threading.Tasks;
using ArchaeoTrails.Application.Interfaces;
using ArchaeoTrails.Domain.Entities;
using ArchaeoTrails.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ArchaeoTrails.Infrastructure.Repositories
{
    public class EfFormSubmissionRepository : IFormSubmissionRepository
    {
        private readonly AppDbContext _db;

        public EfFormSubmissionRepository(AppDbContext db)
        {
            _db = db;
        }

        public async Task<FormSubmission> CreateAsync(FormSubmission submission)
        {
            _db.FormSubmissions.Add(submission);
            await _db.SaveChangesAsync();
            return submission;
        }

        public Task<FormSubmission?> GetByRazorpayOrderIdAsync(string razorpayOrderId) =>
            _db.FormSubmissions.FirstOrDefaultAsync(s => s.RazorpayOrderId == razorpayOrderId);

        public async Task UpdateAsync(FormSubmission submission)
        {
            _db.FormSubmissions.Update(submission);
            await _db.SaveChangesAsync();
        }
    }
}
