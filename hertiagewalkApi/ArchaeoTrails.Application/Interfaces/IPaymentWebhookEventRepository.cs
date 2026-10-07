using System.Threading.Tasks;
using ArchaeoTrails.Domain.Entities;

namespace ArchaeoTrails.Application.Interfaces
{
    /// <summary>Audit log of verified gateway webhooks (PaymentWebhookEvents table).</summary>
    public interface IPaymentWebhookEventRepository
    {
        Task AddAsync(PaymentWebhookEvent webhookEvent);
        Task UpdateAsync(PaymentWebhookEvent webhookEvent);
    }
}
