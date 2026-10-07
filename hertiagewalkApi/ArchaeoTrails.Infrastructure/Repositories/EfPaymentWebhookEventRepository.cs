using System.Threading.Tasks;
using ArchaeoTrails.Application.Interfaces;
using ArchaeoTrails.Domain.Entities;
using ArchaeoTrails.Infrastructure.Data;

namespace ArchaeoTrails.Infrastructure.Repositories
{
    public class EfPaymentWebhookEventRepository : IPaymentWebhookEventRepository
    {
        private readonly AppDbContext _db;

        public EfPaymentWebhookEventRepository(AppDbContext db)
        {
            _db = db;
        }

        public async Task AddAsync(PaymentWebhookEvent webhookEvent)
        {
            _db.PaymentWebhookEvents.Add(webhookEvent);
            await _db.SaveChangesAsync();
        }

        public async Task UpdateAsync(PaymentWebhookEvent webhookEvent)
        {
            _db.PaymentWebhookEvents.Update(webhookEvent);
            await _db.SaveChangesAsync();
        }
    }
}
