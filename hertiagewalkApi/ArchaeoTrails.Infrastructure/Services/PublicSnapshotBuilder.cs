using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using ArchaeoTrails.Application.Features.Experiences;
using ArchaeoTrails.Application.Features.Forms;
using ArchaeoTrails.Application.Interfaces;
using ArchaeoTrails.Application.Services;
using ArchaeoTrails.Domain.Enums;
using ArchaeoTrails.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ArchaeoTrails.Infrastructure.Services
{
    /// <summary>
    /// Builds the public-site snapshot with three batched queries (experiences,
    /// their forms, their booked private dates) — never one query per row. The
    /// DTOs match GET /api/experiences/public/{id} and GET /api/forms/{slug},
    /// so the site renders snapshot data and API data with the same code.
    /// </summary>
    public class PublicSnapshotBuilder : IPublicSnapshotBuilder
    {
        private readonly AppDbContext _db;

        public PublicSnapshotBuilder(AppDbContext db)
        {
            _db = db;
        }

        public async Task<PublicSiteSnapshot> BuildAsync(bool isTest)
        {
            // One day of slack: the site applies the exact (India-time) EndDate
            // cut-off itself, since the snapshot can be days old.
            var cutoff = DateTime.UtcNow.Date.AddDays(-1);

            var experiences = await _db.ExperienceTemplates.AsNoTracking()
                .Where(e => e.IsTest == isTest
                    && e.Status == ExperienceStatus.Published
                    && (e.EndDate == null || e.EndDate >= cutoff))
                .OrderBy(e => e.StartDate)
                .ToListAsync();

            var formIds = experiences
                .Where(e => e.LinkedFormTemplateId.HasValue)
                .Select(e => e.LinkedFormTemplateId!.Value)
                .Distinct()
                .ToList();

            var forms = formIds.Count == 0
                ? new Dictionary<Guid, Domain.Entities.FormTemplate>()
                : await _db.FormTemplates.AsNoTracking()
                    .Where(f => formIds.Contains(f.Id) && f.IsActive)
                    .ToDictionaryAsync(f => f.Id);

            // Same rule as IFormSubmissionRepository.GetBookedSlotsAsync.
            var bookedSlots = formIds.Count == 0
                ? new List<(Guid FormId, DateTime Slot)>()
                : (await _db.FormSubmissions.AsNoTracking()
                    .Where(s => formIds.Contains(s.FormTemplateId)
                        && s.BookedSlot != null
                        && (s.Status == SubmissionStatus.Paid || s.Status == SubmissionStatus.Submitted))
                    .Select(s => new { s.FormTemplateId, Slot = s.BookedSlot!.Value })
                    .ToListAsync())
                    .Select(x => (FormId: x.FormTemplateId, x.Slot))
                    .ToList();

            var snapshot = new PublicSiteSnapshot { GeneratedAt = DateTime.UtcNow, IsTest = isTest };

            foreach (var e in experiences)
            {
                Domain.Entities.FormTemplate? form = null;
                if (e.LinkedFormTemplateId.HasValue) forms.TryGetValue(e.LinkedFormTemplateId.Value, out form);

                var privateSlots = form is null
                    ? JsonSerializer.Deserialize<List<DateTime>>(e.PrivateSlotsJson) ?? new()
                    : BookingRules.AvailablePrivateSlots(e.PrivateSlotsJson,
                        bookedSlots.Where(b => b.FormId == form.Id).Select(b => b.Slot));

                snapshot.Experiences.Add(new PublicExperienceDetailDto
                {
                    Id = e.Id,
                    Type = e.Type.ToString(),
                    Title = e.Title,
                    ContentBlocks = JsonSerializer.Deserialize<List<object>>(e.ContentBlocksJson) ?? new(),
                    RequiresPayment = e.RequiresPayment,
                    Price = e.Price,
                    PrivatePrice = e.PrivatePrice,
                    Currency = e.Currency,
                    CapacityTotal = e.CapacityTotal,
                    CapacityRemaining = e.CapacityRemaining,
                    RegistrationType = e.RegistrationType.ToString(),
                    Slots = new(),
                    PrivateSlots = privateSlots,
                    PrivateMinPeople = e.PrivateMinPeople,
                    // Date-independent part only — see PublicSiteSnapshot.
                    BookingEnabled = form is not null &&
                        (e.CapacityRemaining is null || e.CapacityRemaining > 0) &&
                        !(e.RegistrationType == RegistrationType.Private && privateSlots.Count == 0),
                    LinkedFormSlug = form?.Slug,
                    StartDate = e.StartDate,
                    EndDate = e.EndDate,
                    BookingEndDate = e.BookingEndDate
                });

                if (form is not null)
                {
                    // Same shape and price override as FormsController.GetForm.
                    snapshot.Forms[form.Slug] = new FormDto
                    {
                        Id = form.Id,
                        Title = form.Title,
                        Description = form.Description,
                        Slug = form.Slug,
                        Fields = JsonSerializer.Deserialize<List<FormFieldDefinition>>(form.FieldsJson) ?? new(),
                        RequiresPayment = e.RequiresPayment,
                        Price = e.Price,
                        PrivatePrice = e.PrivatePrice,
                        Currency = e.Currency,
                        ExperienceId = e.Id
                    };
                }
            }

            return snapshot;
        }
    }
}
