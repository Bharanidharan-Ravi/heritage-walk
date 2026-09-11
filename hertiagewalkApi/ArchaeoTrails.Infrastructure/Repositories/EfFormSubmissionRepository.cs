using System;
using System.Collections.Generic;
using System.Linq;
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

        public async Task<FormSubmission?> TryCreateWithCapacityAsync(FormSubmission submission, Guid experienceTemplateId)
        {
            // A single conditional UPDATE, not SELECT-count-then-INSERT: the
            // WHERE clause is the concurrency guard. Two simultaneous requests
            // both issuing this UPDATE will serialize at the database row lock,
            // and only as many succeed as there was remaining capacity for.
            var strategy = _db.Database.CreateExecutionStrategy();

            return await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _db.Database.BeginTransactionAsync();

                var reserved = await _db.ExperienceTemplates
                    .Where(e => e.Id == experienceTemplateId && e.CapacityRemaining > 0)
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(e => e.CapacityRemaining, e => e.CapacityRemaining!.Value - 1));

                if (reserved == 0)
                {
                    await transaction.RollbackAsync();
                    return null;
                }

                _db.FormSubmissions.Add(submission);
                await _db.SaveChangesAsync();
                await transaction.CommitAsync();
                return submission;
            });
        }

        public Task<FormSubmission?> GetByRazorpayOrderIdAsync(string razorpayOrderId) =>
            _db.FormSubmissions.FirstOrDefaultAsync(s => s.RazorpayOrderId == razorpayOrderId);

        public async Task UpdateAsync(FormSubmission submission)
        {
            _db.FormSubmissions.Update(submission);
            await _db.SaveChangesAsync();
        }

        public async Task<IReadOnlyList<FormSubmission>> GetByTemplateIdAsync(Guid formTemplateId) =>
            await _db.FormSubmissions
                .Where(s => s.FormTemplateId == formTemplateId)
                .OrderByDescending(s => s.CreatedAt)
                .ToListAsync();
    }
}
