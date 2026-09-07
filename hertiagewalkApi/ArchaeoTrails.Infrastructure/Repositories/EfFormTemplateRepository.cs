using System.Threading.Tasks;
using ArchaeoTrails.Application.Interfaces;
using ArchaeoTrails.Domain.Entities;
using ArchaeoTrails.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ArchaeoTrails.Infrastructure.Repositories
{
    public class EfFormTemplateRepository : IFormTemplateRepository
    {
        private readonly AppDbContext _db;

        public EfFormTemplateRepository(AppDbContext db)
        {
            _db = db;
        }

        public Task<FormTemplate?> GetBySlugAsync(string slug) =>
            _db.FormTemplates.FirstOrDefaultAsync(t => t.Slug == slug && t.IsActive);

        public async Task<FormTemplate> CreateAsync(FormTemplate template)
        {
            _db.FormTemplates.Add(template);
            await _db.SaveChangesAsync();
            return template;
        }
    }
}
