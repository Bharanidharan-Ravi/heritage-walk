using System.Threading.Tasks;
using ArchaeoTrails.Domain.Entities;

namespace ArchaeoTrails.Application.Interfaces
{
    public interface IPaymentSettingsRepository
    {
        /// <summary>The single active settings row, or null if none exists yet.</summary>
        Task<PaymentSettings?> GetCurrentAsync();

        Task<PaymentSettings> CreateAsync(PaymentSettings settings);

        Task UpdateAsync(PaymentSettings settings);
    }
}
