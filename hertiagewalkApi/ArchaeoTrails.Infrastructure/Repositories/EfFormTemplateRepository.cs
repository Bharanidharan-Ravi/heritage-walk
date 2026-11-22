using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ArchaeoTrails.Application.Interfaces;
using ArchaeoTrails.Application.Services;
using ArchaeoTrails.Domain.Entities;
using ArchaeoTrails.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ArchaeoTrails.Infrastructure.Repositories
{
    public class EfFormTemplateRepository : IFormTemplateRepository
    {
        private readonly AppDbContext _db;
        private readonly PublicSnapshotSignal _snapshotSignal;

        public EfFormTemplateRepository(AppDbContext db, PublicSnapshotSignal snapshotSignal)
        {
            _db = db;
            _snapshotSignal = snapshotSignal;
        }

        public Task<FormTemplate?> GetBySlugAsync(string slug) =>
            _db.FormTemplates.FirstOrDefaultAsync(t => t.Slug == slug && t.IsActive);

        public Task<FormTemplate?> GetByIdAsync(Guid id) =>
            _db.FormTemplates.FirstOrDefaultAsync(t => t.Id == id);

        public async Task<FormTemplate> CreateAsync(FormTemplate template)
        {
            _db.FormTemplates.Add(template);
            await _db.SaveChangesAsync();
            return template;
        }

        public async Task<IReadOnlyList<FormTemplate>> GetAllAsync() =>
            await _db.FormTemplates.OrderByDescending(t => t.CreatedAt).ToListAsync();

        public async Task UpdateAsync(FormTemplate template)
        {
            _db.FormTemplates.Update(template);
            await _db.SaveChangesAsync();
            // Field edits / activation change what the public form shows.
            _snapshotSignal.MarkDirty();
        }
    }
}
