using System;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using ArchaeoTrails.Application.Interfaces;
using ArchaeoTrails.Domain.Entities;
using Microsoft.Extensions.Configuration;

namespace ArchaeoTrails.Infrastructure.Services
{
    /// <summary>
    /// Dry scaffold, same pattern as RazorpayPaymentService/QrCodeService: no
    /// Sanity write token exists yet, so UpsertDraftAsync/PublishAsync never
    /// call out to Sanity — they return a clear "not configured" failure so
    /// ExperiencesController can still persist SanitySyncStatus/LastSyncError
    /// and the workflow keeps working end to end. Wiring in a real token
    /// later (Sanity:WriteToken, via dotnet user-secrets / App Service
    /// config — NEVER exposed to the frontend) makes those two call
    /// Sanity's /v2021-06-07/data/mutate/{dataset} endpoint with no
    /// controller changes.
    ///
    /// UploadImageAssetAsync (hero/gallery image drop-zones in the Experience
    /// Builder — see ExperiencesController.UploadImageAsset) is the one real
    /// Sanity call already wired here, once Sanity:WriteToken is set: it
    /// POSTs the raw file bytes to Sanity's asset endpoint
    /// (/v2021-06-07/assets/images/{dataset}) and hands back the asset's
    /// public CDN url, which is what gets stored on the content block.
    ///
    /// TODO(experiences): implement the real mutate-API calls (Upsert/Publish)
    /// once Sanity:WriteToken / Sanity:ProjectId / Sanity:Dataset are configured.
    /// </summary>
    public class SanityContentService : ISanityContentService
    {
        private readonly IConfiguration _configuration;
        private readonly HttpClient _httpClient;

        public SanityContentService(IConfiguration configuration, HttpClient httpClient)
        {
            _configuration = configuration;
            _httpClient = httpClient;
        }

        public Task<SanitySyncResult> UpsertDraftAsync(ExperienceTemplate experience) =>
            Task.FromResult(NotConfiguredOrTodo());

        public Task<SanitySyncResult> PublishAsync(ExperienceTemplate experience) =>
            Task.FromResult(NotConfiguredOrTodo());

        public async Task<SanityAssetUploadResult> UploadImageAssetAsync(Stream fileStream, string fileName, string contentType)
        {
            var (projectId, dataset, token, configError) = ReadSanityConfig();
            if (configError is not null)
            {
                return SanityAssetUploadResult.Fail(configError);
            }

            try
            {
                var url = $"https://{projectId}.api.sanity.io/v2021-06-07/assets/images/{dataset}?filename={Uri.EscapeDataString(fileName)}";

                using var content = new StreamContent(fileStream);
                content.Headers.ContentType = MediaTypeHeaderValue.Parse(contentType);

                using var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = content };
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

                using var response = await _httpClient.SendAsync(request);
                var body = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    return SanityAssetUploadResult.Fail($"Sanity asset upload failed ({(int)response.StatusCode}): {body}");
                }

                using var json = JsonDocument.Parse(body);
                // Sanity's asset-upload response nests the created asset document
                // under "document"; fall back to a top-level shape just in case.
                var doc = json.RootElement.TryGetProperty("document", out var d) ? d : json.RootElement;

                var assetUrl = doc.TryGetProperty("url", out var u) ? u.GetString() : null;
                var assetId = doc.TryGetProperty("_id", out var i) ? i.GetString() : null;

                if (string.IsNullOrWhiteSpace(assetUrl) || string.IsNullOrWhiteSpace(assetId))
                {
                    return SanityAssetUploadResult.Fail("Sanity asset upload returned an unexpected response shape.");
                }

                return SanityAssetUploadResult.Ok(assetUrl, assetId);
            }
            catch (Exception ex)
            {
                return SanityAssetUploadResult.Fail($"Sanity asset upload failed: {ex.Message}");
            }
        }

        // Matches a Sanity image CDN url and captures the pieces needed to
        // rebuild the asset document _id, e.g.
        //   https://cdn.sanity.io/images/nh8jhz7r/production/07a3d3a5-1600x900.jpg
        // -> document _id "image-07a3d3a5-1600x900-jpg"
        private static readonly Regex SanityImageUrlPattern = new(
            @"^https://cdn\.sanity\.io/images/(?<project>[^/]+)/(?<dataset>[^/]+)/(?<file>[^/?]+)$",
            RegexOptions.Compiled | RegexOptions.IgnoreCase);

        public async Task<SanityAssetDeleteResult> DeleteImageAssetAsync(string assetUrl)
        {
            var (projectId, dataset, token, configError) = ReadSanityConfig();
            if (configError is not null)
            {
                return SanityAssetDeleteResult.Fail(configError);
            }

            var assetId = TryExtractAssetId(assetUrl, projectId, dataset);
            if (assetId is null)
            {
                return SanityAssetDeleteResult.Fail(
                    "Url is not a recognised Sanity CDN image url for the configured project/dataset — refusing to delete.");
            }

            try
            {
                var url = $"https://{projectId}.api.sanity.io/v2021-06-07/data/mutate/{dataset}";
                var mutation = JsonSerializer.Serialize(new
                {
                    mutations = new object[] { new { delete = new { id = assetId } } }
                });

                using var content = new StringContent(mutation, Encoding.UTF8, "application/json");
                using var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = content };
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

                using var response = await _httpClient.SendAsync(request);
                var body = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    return SanityAssetDeleteResult.Fail($"Sanity asset delete failed ({(int)response.StatusCode}): {body}");
                }

                return SanityAssetDeleteResult.Ok();
            }
            catch (Exception ex)
            {
                return SanityAssetDeleteResult.Fail($"Sanity asset delete failed: {ex.Message}");
            }
        }

        /// <summary>
        /// Derives a Sanity asset document _id (e.g. "image-abc123-1600x900-jpg")
        /// from its public CDN url, refusing anything that doesn't match the
        /// configured project/dataset so this endpoint can't be used to delete
        /// documents elsewhere.
        /// </summary>
        private static string? TryExtractAssetId(string assetUrl, string projectId, string dataset)
        {
            if (string.IsNullOrWhiteSpace(assetUrl)) return null;

            var match = SanityImageUrlPattern.Match(assetUrl);
            if (!match.Success) return null;

            if (!string.Equals(match.Groups["project"].Value, projectId, StringComparison.OrdinalIgnoreCase) ||
                !string.Equals(match.Groups["dataset"].Value, dataset, StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }

            var file = match.Groups["file"].Value; // "<hash>-<width>x<height>.<ext>"
            var lastDot = file.LastIndexOf('.');
            if (lastDot < 0 || lastDot == file.Length - 1) return null;

            var baseName = file[..lastDot];
            var ext = file[(lastDot + 1)..];
            return $"image-{baseName}-{ext}";
        }

        private SanitySyncResult NotConfiguredOrTodo()
        {
            var (_, _, _, configError) = ReadSanityConfig();
            if (configError is not null)
            {
                return SanitySyncResult.Fail(configError);
            }

            // TODO(experiences): real Sanity mutate-API call goes here.
            return SanitySyncResult.Fail("Sanity sync not yet implemented — TODO(experiences).");
        }

        private (string ProjectId, string Dataset, string Token, string? Error) ReadSanityConfig()
        {
            var projectId = _configuration["Sanity:ProjectId"];
            var dataset = _configuration["Sanity:Dataset"];
            var token = _configuration["Sanity:WriteToken"];

            if (string.IsNullOrWhiteSpace(token) || token == "REPLACE_ME" ||
                string.IsNullOrWhiteSpace(projectId) || string.IsNullOrWhiteSpace(dataset))
            {
                return (projectId ?? "", dataset ?? "", token ?? "",
                    "Sanity write token is not configured — set Sanity:WriteToken via " +
                    "dotnet user-secrets (dev) or Azure App Service configuration (prod). " +
                    "The experience was saved; sync/upload can be retried once it's configured.");
            }

            return (projectId, dataset, token, null);
        }
    }
}
