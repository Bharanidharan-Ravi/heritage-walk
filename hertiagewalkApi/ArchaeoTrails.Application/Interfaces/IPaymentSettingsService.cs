using System;
using System.Threading.Tasks;
using ArchaeoTrails.Application.Features.Payments;
using ArchaeoTrails.Domain.Entities;

namespace ArchaeoTrails.Application.Interfaces
{
    public interface IPaymentSettingsService
    {
        /// <summary>Current settings entity; creates the default row if the table is empty.</summary>
        Task<PaymentSettings> GetCurrentEntityAsync();

        Task<PaymentSettingsDto> GetAsync();

        /// <summary>Validates and saves; stamps UpdatedAt / UpdatedByUserId.</summary>
        Task<PaymentSettingsResult> UpdateAsync(UpdatePaymentSettingsRequest request, Guid updatedByUserId);
    }
}
