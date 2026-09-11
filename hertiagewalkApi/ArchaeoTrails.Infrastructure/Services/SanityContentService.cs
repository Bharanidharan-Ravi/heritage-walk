using System;
using System.Threading.Tasks;
using ArchaeoTrails.Application.Interfaces;
using ArchaeoTrails.Domain.Entities;
using Microsoft.Extensions.Configuration;

namespace ArchaeoTrails.Infrastructure.Services
{
    /// <summary>
    /// Dry scaffold, same pattern as RazorpayPaymentService/QrCodeService: no
    /// Sanity write token exists yet, so this never calls out to Sanity — it
    /// returns a clear "not configured" failure so ExperiencesController can
    /// still persist SanitySyncStatus/LastSyncError and the workflow keeps
    /// working end to end. Wiring in a real token later (Sanity:WriteToken,
    /// via dotnet user-secrets / App Service config — NEVER exposed to the
    /// frontend) makes UpsertDraftAsync/PublishAsync call Sanity's
    /// /v2021-06-07/data/mutate/{dataset} endpoint with no controller changes.
    ///
    /// TODO(experiences): implement the real HTTP calls once
    /// Sanity:WriteToken / Sanity:ProjectId / Sanity:Dataset are configured.
    /// </summary>
    public class SanityContentService : ISanityContentService
    {
        private readonly IConfiguration _configuration;

        public SanityContentService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public Task<SanitySyncResult> UpsertDraftAsync(ExperienceTemplate experience) =>
            Task.FromResult(NotConfiguredOrTodo());

        public Task<SanitySyncResult> PublishAsync(ExperienceTemplate experience) =>
            Task.FromResult(NotConfiguredOrTodo());

        private SanitySyncResult NotConfiguredOrTodo()
        {
            var token = _configuration["Sanity:WriteToken"];
            if (string.IsNullOrWhiteSpace(token) || token == "REPLACE_ME")
            {
                return SanitySyncResult.Fail(
                    "Sanity write token is not configured — set Sanity:WriteToken via " +
                    "dotnet user-secrets (dev) or Azure App Service configuration (prod). " +
                    "The experience was saved; sync can be retried once it's configured.");
            }

            // TODO(experiences): real Sanity mutate-API call goes here.
            return SanitySyncResult.Fail("Sanity sync not yet implemented — TODO(experiences).");
        }
    }
}
