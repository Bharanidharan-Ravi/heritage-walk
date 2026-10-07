using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ArchaeoTrails.Application.Interfaces;
using ArchaeoTrails.Domain.Entities;
using ArchaeoTrails.Domain.Enums;
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

        public async Task<IReadOnlyList<DateTime>> GetBookedSlotsAsync(Guid formTemplateId) =>
            await _db.FormSubmissions
                .Where(s => s.FormTemplateId == formTemplateId
                    && s.BookedSlot != null
                    && (s.Status == SubmissionStatus.Paid || s.Status == SubmissionStatus.Submitted))
                .Select(s => s.BookedSlot!.Value)
                .ToListAsync();

        public async Task<IReadOnlyList<FormSubmission>> GetActiveHoldsAsync(Guid formTemplateId, DateTime now) =>
            await _db.FormSubmissions
                .Where(s => s.FormTemplateId == formTemplateId
                    && s.Status == SubmissionStatus.PendingPayment
                    && s.ExpiresAt != null && s.ExpiresAt > now)
                .ToListAsync();

        public Task<FormSubmission?> GetByBookingRefAsync(string bookingRef) =>
            _db.FormSubmissions.FirstOrDefaultAsync(s => s.BookingRef == bookingRef);

        public Task<FormSubmission?> GetByGatewayOrderIdAsync(string gatewayOrderId) =>
            _db.FormSubmissions.FirstOrDefaultAsync(s => s.GatewayOrderId == gatewayOrderId);

        public async Task UpdateAsync(FormSubmission submission)
        {
            _db.FormSubmissions.Update(submission);
            await _db.SaveChangesAsync();
        }

        public async Task<bool> TryMarkPaidAsync(Guid submissionId, Guid? experienceTemplateId, int quantity, DateTime paidAt,
            string? gatewayPaymentId = null)
        {
            var strategy = _db.Database.CreateExecutionStrategy();

            return await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await _db.Database.BeginTransactionAsync();

                var updated = await _db.FormSubmissions
                    .Where(s => s.Id == submissionId
                        && (s.Status == SubmissionStatus.PendingPayment || s.Status == SubmissionStatus.Expired))
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(s => s.Status, SubmissionStatus.Paid)
                        .SetProperty(s => s.PaidAt, paidAt)
                        .SetProperty(s => s.GatewayPaymentId, s => gatewayPaymentId ?? s.GatewayPaymentId));

                if (updated == 0)
                {
                    await transaction.RollbackAsync();
                    return false;
                }

                if (experienceTemplateId.HasValue)
                {
                    // Capacity was already checked (with holds) when the booking
                    // was created, so this never goes below zero in practice —
                    // the clamp only covers a payment landing after its hold expired.
                    await _db.ExperienceTemplates
                        .Where(e => e.Id == experienceTemplateId.Value && e.CapacityRemaining != null)
                        .ExecuteUpdateAsync(setters => setters
                            .SetProperty(e => e.CapacityRemaining,
                                e => e.CapacityRemaining!.Value >= quantity ? e.CapacityRemaining!.Value - quantity : 0));
                }

                await transaction.CommitAsync();
                return true;
            });
        }

        public async Task<IReadOnlyList<FormSubmission>> GetStalePendingAsync(string gateway, DateTime cutoff, int take) =>
            await _db.FormSubmissions
                .Where(s => s.Status == SubmissionStatus.PendingPayment
                    && s.PaymentGateway == gateway
                    && s.ExpiresAt != null && s.ExpiresAt <= cutoff)
                .OrderBy(s => s.ExpiresAt)
                .Take(take)
                .ToListAsync();

        public async Task<bool> TryMarkExpiredAsync(Guid submissionId) =>
            await _db.FormSubmissions
                .Where(s => s.Id == submissionId && s.Status == SubmissionStatus.PendingPayment)
                .ExecuteUpdateAsync(setters => setters.SetProperty(s => s.Status, SubmissionStatus.Expired)) > 0;

        public async Task<IReadOnlyList<FormSubmission>> GetByTemplateIdAsync(Guid formTemplateId) =>
            await _db.FormSubmissions
                .Where(s => s.FormTemplateId == formTemplateId)
                .OrderByDescending(s => s.CreatedAt)
                .ToListAsync();
    }
}
