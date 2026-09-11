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
    public class EfExperienceTemplateRepository : IExperienceTemplateRepository
    {
        private readonly AppDbContext _db;

        public EfExperienceTemplateRepository(AppDbContext db)
        {
            _db = db;
        }

        public Task<ExperienceTemplate?> GetByIdAsync(Guid id) =>
            _db.ExperienceTemplates.FirstOrDefaultAsync(e => e.Id == id);

        public Task<ExperienceTemplate?> GetByLinkedFormTemplateIdAsync(Guid formTemplateId) =>
            _db.ExperienceTemplates.FirstOrDefaultAsync(e => e.LinkedFormTemplateId == formTemplateId);

        public async Task<ExperienceTemplate> CreateAsync(ExperienceTemplate experience)
        {
            _db.ExperienceTemplates.Add(experience);
            await _db.SaveChangesAsync();
            return experience;
        }

        public async Task UpdateAsync(ExperienceTemplate experience)
        {
            experience.UpdatedAt = DateTime.UtcNow;
            _db.ExperienceTemplates.Update(experience);
            await _db.SaveChangesAsync();
        }

        public async Task<ExperienceListPage> QueryAsync(ExperienceListQuery query)
        {
            var now = DateTime.UtcNow;
            IQueryable<ExperienceTemplate> q = _db.ExperienceTemplates.AsNoTracking();

            q = query.Tab switch
            {
                ExperienceTab.Pending => q.Where(e =>
                    e.Status == ExperienceStatus.Draft ||
                    e.Status == ExperienceStatus.ChangesRequested ||
                    e.Status == ExperienceStatus.AwaitingApproval ||
                    e.Status == ExperienceStatus.Approved),

                ExperienceTab.Active => q.Where(e =>
                    e.Status == ExperienceStatus.Published &&
                    (e.EndDate == null || e.EndDate > now)),

                ExperienceTab.Closed => q.Where(e =>
                    e.Status == ExperienceStatus.Closed ||
                    (e.Status == ExperienceStatus.Published && e.EndDate != null && e.EndDate <= now)),

                _ => q
            };

            if (query.Tab == ExperienceTab.Pending && query.OwnerScopeUserId.HasValue)
            {
                // Employees only see their own Pending work; Admins pass no scope
                // and see everyone's — see spec §17/§23.
                q = q.Where(e => e.CreatedByUserId == query.OwnerScopeUserId.Value);
            }

            if (query.Type.HasValue)
            {
                q = q.Where(e => e.Type == query.Type.Value);
            }

            if (!string.IsNullOrWhiteSpace(query.Search))
            {
                var term = query.Search.Trim();
                q = q.Where(e =>
                    EF.Functions.Like(e.Title, $"%{term}%") ||
                    EF.Functions.Like(e.Type.ToString(), $"%{term}%") ||
                    EF.Functions.Like(e.Status.ToString(), $"%{term}%") ||
                    EF.Functions.Like(e.Currency, $"%{term}%") ||
                    EF.Functions.Like(e.Price.ToString(), $"%{term}%"));
            }

            q = query.Sort switch
            {
                ExperienceSort.TitleAsc => q.OrderBy(e => e.Title),
                ExperienceSort.TitleDesc => q.OrderByDescending(e => e.Title),
                ExperienceSort.PriceAsc => q.OrderBy(e => e.Price),
                ExperienceSort.PriceDesc => q.OrderByDescending(e => e.Price),
                ExperienceSort.BookingEndDateAsc => q.OrderBy(e => e.BookingEndDate),
                ExperienceSort.BookingEndDateDesc => q.OrderByDescending(e => e.BookingEndDate),
                ExperienceSort.StartDateAsc => q.OrderBy(e => e.StartDate),
                ExperienceSort.StartDateDesc => q.OrderByDescending(e => e.StartDate),
                _ => q.OrderByDescending(e => e.UpdatedAt)
            };

            var totalCount = await q.CountAsync();

            var pageSize = query.PageSize <= 0 ? 10 : query.PageSize;
            var page = query.Page <= 0 ? 1 : query.Page;

            var items = await q.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

            // Batched, page-scoped lookups — never per-row (spec §26).
            var formIds = items.Where(e => e.LinkedFormTemplateId.HasValue)
                .Select(e => e.LinkedFormTemplateId!.Value)
                .Distinct()
                .ToList();

            var bookingCounts = formIds.Count == 0
                ? new Dictionary<Guid, int>()
                : await _db.FormSubmissions
                    .Where(s => formIds.Contains(s.FormTemplateId) &&
                                (s.Status == Domain.Enums.SubmissionStatus.Paid ||
                                 s.Status == Domain.Enums.SubmissionStatus.Submitted))
                    .GroupBy(s => s.FormTemplateId)
                    .Select(g => new { FormTemplateId = g.Key, Count = g.Count() })
                    .ToDictionaryAsync(x => x.FormTemplateId, x => x.Count);

            var creatorIds = items.Select(e => e.CreatedByUserId).Distinct().ToList();
            var creatorNames = creatorIds.Count == 0
                ? new Dictionary<Guid, string>()
                : await _db.Users
                    .Where(u => creatorIds.Contains(u.Id))
                    .Select(u => new { u.Id, u.FullName, u.UserName })
                    .ToDictionaryAsync(u => u.Id, u => string.IsNullOrWhiteSpace(u.FullName) ? (u.UserName ?? "") : u.FullName);

            return new ExperienceListPage
            {
                Items = items,
                TotalCount = totalCount,
                BookingCountsByFormTemplateId = bookingCounts,
                CreatedByNames = creatorNames
            };
        }
    }
}
