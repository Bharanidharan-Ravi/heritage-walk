using System.Threading.Tasks;
using ArchaeoTrails.Domain.Entities;

namespace ArchaeoTrails.Application.Interfaces
{
    public class SanitySyncResult
    {
        public bool Success { get; set; }
        public string? SanityDocumentId { get; set; }
        public string? Error { get; set; }

        public static SanitySyncResult Ok(string sanityDocumentId) =>
            new() { Success = true, SanityDocumentId = sanityDocumentId };

        public static SanitySyncResult Fail(string error) =>
            new() { Success = false, Error = error };
    }

    /// <summary>
    /// Pushes an ExperienceTemplate's editorial content (title, description,
    /// images, highlights, FAQ, ...) to Sanity as a draft/published document.
    /// Azure SQL stays authoritative for the workflow regardless of the
    /// outcome here — a failure must never lose the SQL row (spec §22/§28);
    /// callers persist the returned result into SanitySyncStatus/
    /// LastSyncError/LastSyncedAt and can retry later via
    /// POST /api/experiences/{id}/sync-retry.
    /// </summary>
    public interface ISanityContentService
    {
        /// <summary>Called on submit-for-approval — creates/updates a Sanity draft.</summary>
        Task<SanitySyncResult> UpsertDraftAsync(ExperienceTemplate experience);

        /// <summary>Called on Publish — publishes the mirrored Sanity document.</summary>
        Task<SanitySyncResult> PublishAsync(ExperienceTemplate experience);
    }
}
