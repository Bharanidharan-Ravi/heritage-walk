using System.Threading.Tasks;
using ArchaeoTrails.Domain.Entities;

namespace ArchaeoTrails.Application.Interfaces
{
    public interface IFormTemplateRepository
    {
        Task<FormTemplate?> GetBySlugAsync(string slug);
        Task<FormTemplate> CreateAsync(FormTemplate template);
    }
}
