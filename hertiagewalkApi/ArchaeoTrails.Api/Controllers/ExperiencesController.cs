using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using ArchaeoTrails.Application.Features.Experiences;
using ArchaeoTrails.Application.Interfaces;
using ArchaeoTrails.Domain.Constants;
using ArchaeoTrails.Domain.Entities;
using ArchaeoTrails.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ArchaeoTrails.Api.Controllers
{
    /// <summary>
    /// Experience Builder management API: Walk/Seminar/Course experiences going
    /// through the Employee draft -> Admin approval -> publish workflow. See the
    /// Experiences module spec for the full picture; the Form Generator
    /// (FormsController) is untouched by this — an experience only ever
    /// *references* a FormTemplate via LinkedFormTemplateId for booking.
    /// </summary>
    [ApiController]
    [Route("api/experiences")]
    [Authorize(Roles = Roles.StaffPolicy)]
    public class ExperiencesController : ControllerBase
    {
        // Mirrors the client-side check in ExperienceBlockSettings.jsx —
        // both sides reject an oversized/wrong-type file before it's ever
        // handed to Sanity.
        private const long MaxImageBytes = 8 * 1024 * 1024;
        private static readonly string[] AllowedImageContentTypes =
            { "image/jpeg", "image/png", "image/webp", "image/gif" };

        private readonly IExperienceTemplateRepository _experiences;
        private readonly IFormTemplateRepository _formTemplates;
        private readonly IAuthService _authService;
        private readonly ISanityContentService _sanity;
        private readonly IExperienceEventPublisher _events;

        public ExperiencesController(
            IExperienceTemplateRepository experiences,
            IFormTemplateRepository formTemplates,
            IAuthService authService,
            ISanityContentService sanity,
            IExperienceEventPublisher events)
        {
            _experiences = experiences;
            _formTemplates = formTemplates;
            _authService = authService;
            _sanity = sanity;
            _events = events;
        }

        // GET /api/experiences?tab=pending&type=walk&search=&sort=updated_desc&page=1&pageSize=10
        [HttpGet]
        public async Task<IActionResult> List(
            [FromQuery] string tab = "pending",
            [FromQuery] string? type = null,
            [FromQuery] string? search = null,
            [FromQuery] string sort = "updated_desc",
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            if (!Enum.TryParse<ExperienceTab>(tab, true, out var parsedTab))
            {
                return BadRequest(new { status = "error", message = "Invalid tab. Use pending, active or closed." });
            }

            ExperienceType? parsedType = null;
            if (!string.IsNullOrWhiteSpace(type) && !type.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                if (!Enum.TryParse<ExperienceType>(type, true, out var t))
                {
                    return BadRequest(new { status = "error", message = "Invalid type. Use walk, seminar or course." });
                }
                parsedType = t;
            }

            var query = new ExperienceListQuery
            {
                Tab = parsedTab,
                Type = parsedType,
                Search = search,
                Sort = ParseSort(sort),
                Page = page,
                // Upper bound raised from 50 -> 500 so the admin panel can
                // fetch a whole tab's rows in one call and filter/sort/
                // paginate client-side (see AdminExperiences.jsx) instead of
                // re-querying SQL on every search keystroke/sort/page change.
                PageSize = Math.Clamp(pageSize, 1, 500)
            };

            // Employees only ever see their own Pending work; Admins see everyone's.
            if (parsedTab == ExperienceTab.Pending && !User.IsInRole(Roles.Admin))
            {
                query.OwnerScopeUserId = GetUserId();
            }

            var result = await _experiences.QueryAsync(query);

            var items = result.Items.Select(e => ToListItemDto(e, result)).ToList();

            return Ok(new PagedResult<ExperienceListItemDto>
            {
                Items = items,
                TotalCount = result.TotalCount,
                Page = query.Page,
                PageSize = query.PageSize
            });
        }

        // ---- Public (anonymous, Published-only) -------------------------------
        // Consumed by the public marketing site (ExperienceList.jsx / ExperienceDetail.jsx),
        // never by the admin panel. Deliberately separate actions rather than
        // reusing List/GetById with a role check — those two stay Employee/Admin
        // -only and keep returning every status; these two only ever see
        // Published rows and carry no workflow/ownership fields.

        // GET /api/experiences/public?type=walk&search=&page=1&pageSize=24
        [HttpGet("public")]
        [AllowAnonymous]
        public async Task<IActionResult> ListPublic(
            [FromQuery] string? type = null,
            [FromQuery] string? search = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 24)
        {
            ExperienceType? parsedType = null;
            if (!string.IsNullOrWhiteSpace(type) && !type.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                if (!Enum.TryParse<ExperienceType>(type, true, out var t))
                {
                    return BadRequest(new { status = "error", message = "Invalid type. Use walk, seminar or course." });
                }
                parsedType = t;
            }

            var query = new ExperienceListQuery
            {
                // Active = Published AND (EndDate is null OR still in the future) — see ExperienceStatus.
                Tab = ExperienceTab.Active,
                Type = parsedType,
                Search = search,
                Sort = ExperienceSort.StartDateAsc,
                Page = page,
                PageSize = Math.Clamp(pageSize, 1, 100)
            };

            var result = await _experiences.QueryAsync(query);
            var items = result.Items.Select(e => new PublicExperienceListItemDto
            {
                Id = e.Id,
                Type = e.Type.ToString(),
                Title = e.Title,
                ContentBlocks = JsonSerializer.Deserialize<List<object>>(e.ContentBlocksJson) ?? new(),
                RequiresPayment = e.RequiresPayment,
                Price = e.Price,
                Currency = e.Currency,
                StartDate = e.StartDate,
                EndDate = e.EndDate
            }).ToList();

            return Ok(new PagedResult<PublicExperienceListItemDto>
            {
                Items = items,
                TotalCount = result.TotalCount,
                Page = query.Page,
                PageSize = query.PageSize
            });
        }

        // GET /api/experiences/public/{id}
        [HttpGet("public/{id:guid}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublicById(Guid id)
        {
            var experience = await _experiences.GetByIdAsync(id);
            if (experience is null || experience.Status != ExperienceStatus.Published)
            {
                // Never distinguishes "doesn't exist" from "not published yet" to an anonymous caller.
                return NotFound();
            }

            string? linkedFormSlug = null;
            if (experience.LinkedFormTemplateId.HasValue)
            {
                var form = await _formTemplates.GetByIdAsync(experience.LinkedFormTemplateId.Value);
                linkedFormSlug = form?.Slug;
            }

            var bookingEnabled = linkedFormSlug is not null &&
                (experience.BookingEndDate is null || experience.BookingEndDate > DateTime.UtcNow) &&
                (experience.CapacityRemaining is null || experience.CapacityRemaining > 0);

            return Ok(new PublicExperienceDetailDto
            {
                Id = experience.Id,
                Type = experience.Type.ToString(),
                Title = experience.Title,
                ContentBlocks = JsonSerializer.Deserialize<List<object>>(experience.ContentBlocksJson) ?? new(),
                RequiresPayment = experience.RequiresPayment,
                Price = experience.Price,
                Currency = experience.Currency,
                CapacityTotal = experience.CapacityTotal,
                CapacityRemaining = experience.CapacityRemaining,
                RegistrationType = experience.RegistrationType.ToString(),
                Slots = JsonSerializer.Deserialize<List<DateTime>>(experience.SlotsJson) ?? new(),
                BookingEnabled = bookingEnabled,
                LinkedFormSlug = linkedFormSlug,
                StartDate = experience.StartDate,
                EndDate = experience.EndDate,
                BookingEndDate = experience.BookingEndDate
            });
        }

        // GET /api/experiences/{id}
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var experience = await _experiences.GetByIdAsync(id);
            if (experience is null) return NotFound();

            return Ok(await ToDetailDtoAsync(experience));
        }

        // POST /api/experiences
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateExperienceRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
            {
                return BadRequest(new { status = "error", message = "Give the experience a title." });
            }
            if (!Enum.TryParse<ExperienceType>(request.Type, true, out var type))
            {
                return BadRequest(new { status = "error", message = "Invalid experience type." });
            }

            var experience = new ExperienceTemplate
            {
                Type = type,
                Status = ExperienceStatus.Draft,
                Title = request.Title.Trim(),
                ContentBlocksJson = JsonSerializer.Serialize(request.ContentBlocks),
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                BookingEndDate = request.BookingEndDate,
                CreatedByUserId = GetUserId()
            };

            await _experiences.CreateAsync(experience);
            await _events.ExperienceCreatedAsync(experience.Id);
            return Ok(new { status = "success", id = experience.Id });
        }

        // PUT /api/experiences/{id}
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateExperienceRequest request)
        {
            var experience = await _experiences.GetByIdAsync(id);
            if (experience is null) return NotFound();

            var isAdmin = User.IsInRole(Roles.Admin);
            var isOwnerEditableStatus = experience.CreatedByUserId == GetUserId() &&
                (experience.Status == ExperienceStatus.Draft || experience.Status == ExperienceStatus.ChangesRequested);

            if (!isAdmin && !isOwnerEditableStatus)
            {
                return Forbid();
            }

            experience.Title = request.Title.Trim();
            experience.ContentBlocksJson = JsonSerializer.Serialize(request.ContentBlocks);
            experience.StartDate = request.StartDate;
            experience.EndDate = request.EndDate;
            experience.BookingEndDate = request.BookingEndDate;

            await _experiences.UpdateAsync(experience);
            await _events.ExperienceUpdatedAsync(experience.Id);
            return Ok(new { status = "success" });
        }

        // PUT /api/experiences/{id}/payment  (Admin only)
        [HttpPut("{id:guid}/payment")]
        [Authorize(Roles = Roles.Admin)]
        public async Task<IActionResult> SetPayment(Guid id, [FromBody] SetExperiencePaymentRequest request)
        {
            var experience = await _experiences.GetByIdAsync(id);
            if (experience is null) return NotFound();

            if (request.RequiresPayment && request.Price <= 0)
            {
                return BadRequest(new { status = "error", message = "A paid experience needs a price above zero." });
            }
            if (request.LinkedFormTemplateId.HasValue &&
                await _formTemplates.GetByIdAsync(request.LinkedFormTemplateId.Value) is null)
            {
                return BadRequest(new { status = "error", message = "That registration form doesn't exist." });
            }
            if (!Enum.TryParse<RegistrationType>(request.RegistrationType, true, out var registrationType))
            {
                return BadRequest(new { status = "error", message = "Invalid registration type. Use Individual, Group or Both." });
            }
            if (registrationType != RegistrationType.Individual && request.Slots.Count == 0)
            {
                return BadRequest(new { status = "error", message = "Add at least one bookable date for Group registration." });
            }

            experience.RequiresPayment = request.RequiresPayment;
            experience.Price = request.RequiresPayment ? request.Price : 0m;
            experience.Currency = request.Currency;
            experience.CapacityTotal = request.CapacityTotal;
            // Re-seed the atomic counter whenever capacity is (re)configured.
            experience.CapacityRemaining = request.CapacityTotal;
            experience.LinkedFormTemplateId = request.LinkedFormTemplateId;
            experience.RegistrationType = registrationType;
            // Individual-only ignores slots entirely (BookingEndDate alone gates
            // it) — clearing them here instead of trusting the caller to send an
            // empty list keeps a stale Group slot list from lingering unseen.
            // Duplicate dates are kept as-is (not deduped): an Admin can add
            // more than one slot for the same day — e.g. a morning and an
            // evening batch — even though a slot carries no other field yet.
            experience.SlotsJson = registrationType == RegistrationType.Individual
                ? "[]"
                : JsonSerializer.Serialize(request.Slots.OrderBy(d => d));

            await _experiences.UpdateAsync(experience);
            await _events.ExperienceUpdatedAsync(experience.Id);
            return Ok(new { status = "success" });
        }

        // POST /api/experiences/{id}/submit
        [HttpPost("{id:guid}/submit")]
        public async Task<IActionResult> Submit(Guid id)
        {
            var experience = await _experiences.GetByIdAsync(id);
            if (experience is null) return NotFound();

            var isAdmin = User.IsInRole(Roles.Admin);
            if (!isAdmin && experience.CreatedByUserId != GetUserId())
            {
                return Forbid();
            }
            if (experience.Status != ExperienceStatus.Draft && experience.Status != ExperienceStatus.ChangesRequested)
            {
                return Conflict(new { status = "error", message = "Only a Draft or Changes Requested experience can be submitted." });
            }

            experience.Status = ExperienceStatus.AwaitingApproval;
            experience.ChangesRequestedReason = null;
            await _experiences.UpdateAsync(experience);

            await SyncAsync(experience, publish: false);
            await _events.ApprovalRequestedAsync(experience.Id, experience.CreatedByUserId);
            return Ok(new { status = "success" });
        }

        // POST /api/experiences/{id}/approve  (Admin only)
        [HttpPost("{id:guid}/approve")]
        [Authorize(Roles = Roles.Admin)]
        public async Task<IActionResult> Approve(Guid id)
        {
            var experience = await _experiences.GetByIdAsync(id);
            if (experience is null) return NotFound();
            if (experience.Status != ExperienceStatus.AwaitingApproval)
            {
                return Conflict(new { status = "error", message = "Only an Awaiting Approval experience can be approved." });
            }

            experience.Status = ExperienceStatus.Approved;
            experience.ApprovedByUserId = GetUserId();
            experience.ApprovedAt = DateTime.UtcNow;
            await _experiences.UpdateAsync(experience);

            await _events.ExperienceStatusChangedAsync(experience.Id, experience.CreatedByUserId, experience.Status.ToString(), experience.UpdatedAt);
            return Ok(new { status = "success" });
        }

        // POST /api/experiences/{id}/request-changes  (Admin only)
        [HttpPost("{id:guid}/request-changes")]
        [Authorize(Roles = Roles.Admin)]
        public async Task<IActionResult> RequestChanges(Guid id, [FromBody] RequestChangesRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Reason))
            {
                return BadRequest(new { status = "error", message = "A reason is required." });
            }

            var experience = await _experiences.GetByIdAsync(id);
            if (experience is null) return NotFound();
            if (experience.Status != ExperienceStatus.AwaitingApproval)
            {
                return Conflict(new { status = "error", message = "Only an Awaiting Approval experience can be sent back for changes." });
            }

            experience.Status = ExperienceStatus.ChangesRequested;
            experience.ChangesRequestedReason = request.Reason.Trim();
            await _experiences.UpdateAsync(experience);

            await _events.ExperienceStatusChangedAsync(experience.Id, experience.CreatedByUserId, experience.Status.ToString(), experience.UpdatedAt);
            return Ok(new { status = "success" });
        }

        // POST /api/experiences/{id}/publish  (Admin only)
        [HttpPost("{id:guid}/publish")]
        [Authorize(Roles = Roles.Admin)]
        public async Task<IActionResult> Publish(Guid id)
        {
            var experience = await _experiences.GetByIdAsync(id);
            if (experience is null) return NotFound();
            if (experience.Status != ExperienceStatus.Approved)
            {
                return Conflict(new { status = "error", message = "Only an Approved experience can be published." });
            }
            if (experience.RequiresPayment && experience.Price <= 0)
            {
                return BadRequest(new { status = "error", message = "Set a price above zero before publishing a paid experience." });
            }
            if (experience.LinkedFormTemplateId is null)
            {
                return BadRequest(new { status = "error", message = "Link a registration form before publishing." });
            }

            experience.Status = ExperienceStatus.Published;
            experience.PublishedAt = DateTime.UtcNow;
            await _experiences.UpdateAsync(experience);

            await SyncAsync(experience, publish: true);
            await _events.ExperiencePublishedAsync(experience.Id, experience.CreatedByUserId, experience.UpdatedAt);
            return Ok(new { status = "success" });
        }

        // POST /api/experiences/{id}/close  (Admin only)
        [HttpPost("{id:guid}/close")]
        [Authorize(Roles = Roles.Admin)]
        public async Task<IActionResult> Close(Guid id)
        {
            var experience = await _experiences.GetByIdAsync(id);
            if (experience is null) return NotFound();
            if (experience.Status != ExperienceStatus.Published)
            {
                return Conflict(new { status = "error", message = "Only a Published/Active experience can be closed." });
            }

            experience.Status = ExperienceStatus.Closed;
            experience.ClosedAt = DateTime.UtcNow;
            await _experiences.UpdateAsync(experience);

            await _events.ExperienceStatusChangedAsync(experience.Id, experience.CreatedByUserId, experience.Status.ToString(), experience.UpdatedAt);
            return Ok(new { status = "success" });
        }

        // POST /api/experiences/assets/image
        // Backs the hero-image / gallery drag-and-drop drop-zones in the
        // Experience Builder (ExperienceBlockSettings.jsx) — the file never
        // touches the frontend's Sanity config (no write token there); it's
        // streamed straight through to Sanity's asset store here, and only
        // the resulting public CDN url comes back.
        [HttpPost("assets/image")]
        [RequestSizeLimit(MaxImageBytes)]
        public async Task<IActionResult> UploadImageAsset(IFormFile? file)
        {
            if (file is null || file.Length == 0)
            {
                return BadRequest(new { status = "error", message = "No image file was sent." });
            }
            if (file.Length > MaxImageBytes)
            {
                return BadRequest(new { status = "error", message = "Image is larger than 8MB." });
            }
            if (Array.IndexOf(AllowedImageContentTypes, file.ContentType) < 0)
            {
                return BadRequest(new { status = "error", message = "Only JPEG, PNG, WebP or GIF images are allowed." });
            }

            await using var stream = file.OpenReadStream();
            var result = await _sanity.UploadImageAssetAsync(stream, file.FileName, file.ContentType);
            if (!result.Success)
            {
                // Sanity not configured yet, or the upload itself failed — either
                // way nothing was saved, so this is a plain error, not partial success.
                return StatusCode(502, new { status = "error", message = result.Error });
            }

            return Ok(new ImageAssetDto { Url = result.Url!, AssetId = result.AssetId! });
        }

        // DELETE /api/experiences/assets/image?url=<sanity cdn url>
        // Frees the underlying Sanity asset when a hero/gallery image is
        // removed (or replaced) in the builder, so unused uploads don't sit
        // around consuming the Sanity project's asset storage indefinitely.
        // Only the public CDN url is ever known client-side (it's the only
        // thing stored on the content block), so the asset id is derived
        // from it server-side — see SanityContentService.DeleteImageAssetAsync.
        [HttpDelete("assets/image")]
        public async Task<IActionResult> DeleteImageAsset([FromQuery] string? url)
        {
            if (string.IsNullOrWhiteSpace(url))
            {
                return BadRequest(new { status = "error", message = "url is required." });
            }

            var result = await _sanity.DeleteImageAssetAsync(url);
            if (!result.Success)
            {
                return StatusCode(502, new { status = "error", message = result.Error });
            }

            return Ok(new ExperienceOperationResult { Success = true });
        }

        // POST /api/experiences/{id}/sync-retry  (Admin only)
        [HttpPost("{id:guid}/sync-retry")]
        [Authorize(Roles = Roles.Admin)]
        public async Task<IActionResult> SyncRetry(Guid id)
        {
            var experience = await _experiences.GetByIdAsync(id);
            if (experience is null) return NotFound();

            await SyncAsync(experience, publish: experience.Status == ExperienceStatus.Published);
            return Ok(new { status = experience.SanitySyncStatus.ToString() });
        }

        // ---- helpers ---------------------------------------------------------

        private async Task SyncAsync(ExperienceTemplate experience, bool publish)
        {
            var result = publish
                ? await _sanity.PublishAsync(experience)
                : await _sanity.UpsertDraftAsync(experience);

            experience.SanitySyncStatus = result.Success ? SanitySyncStatus.Synced : SanitySyncStatus.Failed;
            experience.LastSyncError = result.Success ? null : result.Error;
            experience.LastSyncedAt = DateTime.UtcNow;
            if (result.Success && result.SanityDocumentId is not null)
            {
                experience.SanityDocumentId = result.SanityDocumentId;
            }

            // Sync status is best-effort bookkeeping on an already-saved row —
            // never lets a Sanity failure undo the workflow transition above.
            await _experiences.UpdateAsync(experience);
        }

        private Guid GetUserId()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            return Guid.TryParse(claim, out var id) ? id : Guid.Empty;
        }

        private static ExperienceSort ParseSort(string sort) => sort?.ToLowerInvariant() switch
        {
            "title_asc" => ExperienceSort.TitleAsc,
            "title_desc" => ExperienceSort.TitleDesc,
            "price_asc" => ExperienceSort.PriceAsc,
            "price_desc" => ExperienceSort.PriceDesc,
            "bookingenddate_asc" => ExperienceSort.BookingEndDateAsc,
            "bookingenddate_desc" => ExperienceSort.BookingEndDateDesc,
            "startdate_asc" => ExperienceSort.StartDateAsc,
            "startdate_desc" => ExperienceSort.StartDateDesc,
            _ => ExperienceSort.UpdatedAtDesc
        };

        private static ExperienceListItemDto ToListItemDto(ExperienceTemplate e, ExperienceListPage page)
        {
            var confirmed = e.LinkedFormTemplateId.HasValue &&
                page.BookingCountsByFormTemplateId.TryGetValue(e.LinkedFormTemplateId.Value, out var count)
                ? count
                : 0;

            var bookingEnabled = e.LinkedFormTemplateId.HasValue &&
                (e.BookingEndDate == null || e.BookingEndDate > DateTime.UtcNow);

            return new ExperienceListItemDto
            {
                Id = e.Id,
                Title = e.Title,
                Type = e.Type.ToString(),
                Status = e.Status.ToString(),
                RequiresPayment = e.RequiresPayment,
                Price = e.Price,
                Currency = e.Currency,
                BookingConfirmed = confirmed,
                CapacityTotal = e.CapacityTotal,
                BookingEnabled = bookingEnabled,
                RegistrationType = e.RegistrationType.ToString(),
                Slots = JsonSerializer.Deserialize<List<DateTime>>(e.SlotsJson) ?? new(),
                StartDate = e.StartDate,
                EndDate = e.EndDate,
                BookingEndDate = e.BookingEndDate,
                CreatedByUserId = e.CreatedByUserId,
                CreatedByName = page.CreatedByNames.TryGetValue(e.CreatedByUserId, out var name) ? name : "",
                UpdatedAt = e.UpdatedAt
            };
        }

        private async Task<ExperienceDetailDto> ToDetailDtoAsync(ExperienceTemplate e)
        {
            // Single-row lookup — the list endpoint is what batches this (see
            // IExperienceTemplateRepository.QueryAsync); a one-off detail view
            // doesn't need that machinery.
            var creator = await _authService.GetByIdAsync(e.CreatedByUserId);
            var createdByName = creator?.FullName ?? creator?.UserName ?? "";

            return new ExperienceDetailDto
            {
                Id = e.Id,
                Type = e.Type.ToString(),
                Status = e.Status.ToString(),
                Title = e.Title,
                ContentBlocks = JsonSerializer.Deserialize<List<object>>(e.ContentBlocksJson) ?? new(),
                RequiresPayment = e.RequiresPayment,
                Price = e.Price,
                Currency = e.Currency,
                CapacityTotal = e.CapacityTotal,
                CapacityRemaining = e.CapacityRemaining,
                LinkedFormTemplateId = e.LinkedFormTemplateId,
                RegistrationType = e.RegistrationType.ToString(),
                Slots = JsonSerializer.Deserialize<List<DateTime>>(e.SlotsJson) ?? new(),
                StartDate = e.StartDate,
                EndDate = e.EndDate,
                BookingEndDate = e.BookingEndDate,
                CreatedByUserId = e.CreatedByUserId,
                CreatedByName = createdByName,
                ChangesRequestedReason = e.ChangesRequestedReason,
                SanitySyncStatus = e.SanitySyncStatus.ToString(),
                LastSyncError = e.LastSyncError,
                LastSyncedAt = e.LastSyncedAt,
                CreatedAt = e.CreatedAt,
                UpdatedAt = e.UpdatedAt
            };
        }

    }
}
