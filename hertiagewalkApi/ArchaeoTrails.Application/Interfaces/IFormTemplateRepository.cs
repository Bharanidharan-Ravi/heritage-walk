using System.Collections.Generic;
using System.Threading.Tasks;
using ArchaeoTrails.Domain.Entities;

namespace ArchaeoTrails.Application.Interfaces
{
    public interface IFormTemplateRepository
    {
        Task<FormTemplate?> GetBySlugAsync(string slug);
        Task<FormTemplate> CreateAsync(FormTemplate template);

        /// <summary>Admin-only: every template including inactive ones, newest first.</summary>
        Task<IReadOnlyList<FormTemplate>> GetAllAsync();

        Task<FormTemplate?> GetByIdAsync(System.Guid id);
        Task UpdateAsync(FormTemplate template);
    }
}
