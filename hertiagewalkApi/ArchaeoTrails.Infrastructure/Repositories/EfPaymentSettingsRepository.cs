using System.Linq;
using System.Threading.Tasks;
using ArchaeoTrails.Application.Interfaces;
using ArchaeoTrails.Domain.Entities;
using ArchaeoTrails.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ArchaeoTrails.Infrastructure.Repositories
{
    public class EfPaymentSettingsRepository : IPaymentSettingsRepository
    {
        private readonly AppDbContext _db;

        public EfPaymentSettingsRepository(AppDbContext db)
        {
            _db = db;
        }

        // Normally one row; if more ever exist the oldest is the active one.
        public Task<PaymentSettings?> GetCurrentAsync() =>
            _db.PaymentSettings.OrderBy(p => p.CreatedAt).FirstOrDefaultAsync();

        public async Task<PaymentSettings> CreateAsync(PaymentSettings settings)
        {
            _db.PaymentSettings.Add(settings);
            await _db.SaveChangesAsync();
            return settings;
        }

        public async Task UpdateAsync(PaymentSettings settings)
        {
            _db.PaymentSettings.Update(settings);
            await _db.SaveChangesAsync();
        }
    }
}
