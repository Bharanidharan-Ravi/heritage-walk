using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using ArchaeoTrails.Domain.Entities;
using ArchaeoTrails.Domain.Enums;
using ArchaeoTrails.Infrastructure.Repositories;
using ArchaeoTrails.Infrastructure.Services;

namespace ArchaeoTrails.Application.Tests.Integration
{
    /// <summary>
    /// What the public site reads from Sanity instead of the API — built from
    /// a real SQL Server database. (Other tests share the database, so every
    /// assertion looks up the rows it seeded.)
    /// </summary>
    [Collection(SqlCollection.Name)]
    [Trait("Category", "Sql")]
    public class PublicSnapshotTests
    {
        private readonly TestWorld _w;

        public PublicSnapshotTests(SqlTestDatabase sql) => _w = new TestWorld(sql);

        private async Task<Features.Experiences.PublicSiteSnapshot> BuildAsync(bool isTest = false)
        {
            await using var db = _w.Db();
            return await new PublicSnapshotBuilder(db).BuildAsync(isTest);
        }

        [Fact]
        public async Task OnlyPublishedNotEnded_OnTheRightSite_OrderedByStart()
        {
            var (later, _) = await _w.SeedAsync(e => e.StartDate = DateTime.UtcNow.Date.AddDays(40));
            var (sooner, _) = await _w.SeedAsync(e => e.StartDate = DateTime.UtcNow.Date.AddDays(5));
            var (draft, _) = await _w.SeedAsync(e => e.Status = ExperienceStatus.Draft);
            var (closed, _) = await _w.SeedAsync(e => e.Status = ExperienceStatus.Closed);
            var (ended, _) = await _w.SeedAsync(e => e.EndDate = DateTime.UtcNow.Date.AddDays(-3));
            var (endedYesterday, _) = await _w.SeedAsync(e => e.EndDate = DateTime.UtcNow.Date.AddDays(-1));
            var (noEnd, _) = await _w.SeedAsync(e => e.EndDate = null);
            var (testOnly, _) = await _w.SeedAsync(e => e.IsTest = true);

            var live = await BuildAsync();
            var ids = live.Experiences.Select(e => e.Id).ToList();

            Assert.False(live.IsTest);
            Assert.Equal(1, live.SchemaVersion);
            Assert.Contains(later.Id, ids);
            Assert.Contains(sooner.Id, ids);
            Assert.Contains(noEnd.Id, ids);
            // Kept one day: the site applies the exact India-time cut-off itself.
            Assert.Contains(endedYesterday.Id, ids);
            Assert.DoesNotContain(draft.Id, ids);
            Assert.DoesNotContain(closed.Id, ids);
            Assert.DoesNotContain(ended.Id, ids);
            Assert.DoesNotContain(testOnly.Id, ids);
            Assert.True(ids.IndexOf(sooner.Id) < ids.IndexOf(later.Id));

            var test = await BuildAsync(isTest: true);
            Assert.True(test.IsTest);
            Assert.Contains(testOnly.Id, test.Experiences.Select(e => e.Id));
            Assert.DoesNotContain(later.Id, test.Experiences.Select(e => e.Id));
        }

        [Fact]
        public async Task Detail_MatchesThePublicApiShape()
        {
            var (exp, form) = await _w.SeedAsync(e => e.ContentBlocksJson = "[{\"type\":\"heading\",\"text\":\"Hello\"}]");
            var snap = await BuildAsync();
            var d = snap.Experiences.Single(e => e.Id == exp.Id);

            Assert.Equal("Walk", d.Type);
            Assert.Equal(exp.Title, d.Title);
            Assert.Single(d.ContentBlocks);
            Assert.Equal(500m, d.Price);
            Assert.Equal(3000m, d.PrivatePrice);
            Assert.Equal("Both", d.RegistrationType);
            Assert.Equal(10, d.CapacityRemaining);
            Assert.Equal(form.Slug, d.LinkedFormSlug);
            Assert.True(d.BookingEnabled);
        }

        [Fact]
        public async Task Form_IsKeyedBySlug_WithTheExperiencesPrices()
        {
            var (exp, form) = await _w.SeedAsync();
            var snap = await BuildAsync();

            var f = snap.Forms[form.Slug];
            Assert.Equal(form.Id, f.Id);
            Assert.Equal(exp.Id, f.ExperienceId);
            Assert.Equal(500m, f.Price);          // the experience's, not the form's own 1
            Assert.Equal(3000m, f.PrivatePrice);
            Assert.True(f.RequiresPayment);
            Assert.Equal(TestWorld.NameField, Assert.Single(f.Fields).Name);
        }

        [Fact]
        public async Task InactiveOrMissingForm_DisablesBooking_AndIsNotPublished()
        {
            var (inactive, inactiveForm) = await _w.SeedAsync(formActive: false);
            var (noForm, _) = await _w.SeedAsync(linkForm: false);
            var snap = await BuildAsync();

            var a = snap.Experiences.Single(e => e.Id == inactive.Id);
            Assert.False(a.BookingEnabled);
            Assert.Null(a.LinkedFormSlug);
            Assert.False(snap.Forms.ContainsKey(inactiveForm.Slug));
            Assert.False(snap.Experiences.Single(e => e.Id == noForm.Id).BookingEnabled);
        }

        [Fact]
        public async Task SoldOut_DisablesBooking_UnlimitedDoesNot()
        {
            var (soldOut, _) = await _w.SeedAsync(e => e.CapacityRemaining = 0);
            var (unlimited, _) = await _w.SeedAsync(e => { e.CapacityRemaining = null; e.CapacityTotal = null; });
            var snap = await BuildAsync();
            Assert.False(snap.Experiences.Single(e => e.Id == soldOut.Id).BookingEnabled);
            Assert.True(snap.Experiences.Single(e => e.Id == unlimited.Id).BookingEnabled);
        }

        [Fact]
        public async Task BookedPrivateDates_AreRemoved_AndAllTaken_ClosesPrivateOnly()
        {
            var d1 = DateTime.UtcNow.Date.AddDays(15);
            var d2 = DateTime.UtcNow.Date.AddDays(16);
            var slots = $"[\"{d1:yyyy-MM-dd}T00:00:00\",\"{d2:yyyy-MM-dd}T00:00:00\"]";
            var (both, bothForm) = await _w.SeedAsync(e => e.PrivateSlotsJson = slots);
            var (privateOnly, privForm) = await _w.SeedAsync(e => { e.PrivateSlotsJson = slots; e.RegistrationType = RegistrationType.Private; });

            await using (var db = _w.Db())
            {
                FormSubmission Taken(FormTemplate f, DateTime day, SubmissionStatus s) => new()
                {
                    FormTemplateId = f.Id, BookedSlot = day, Status = s, Quantity = 2
                };
                db.FormSubmissions.AddRange(
                    Taken(bothForm, d1, SubmissionStatus.Paid),
                    Taken(bothForm, d2, SubmissionStatus.Expired),   // doesn't count
                    Taken(privForm, d1, SubmissionStatus.Paid),
                    Taken(privForm, d2, SubmissionStatus.Submitted));
                await db.SaveChangesAsync();
            }

            var snap = await BuildAsync();
            var b = snap.Experiences.Single(e => e.Id == both.Id);
            Assert.Equal(d2, Assert.Single(b.PrivateSlots));
            Assert.True(b.BookingEnabled); // Group still open

            var p = snap.Experiences.Single(e => e.Id == privateOnly.Id);
            Assert.Empty(p.PrivateSlots);
            Assert.False(p.BookingEnabled);
        }

        [Fact]
        public async Task BookingEndDate_IsLeftToTheSite()
        {
            // Snapshots can be days old, so a past BookingEndDate is NOT baked
            // into bookingEnabled — UI/src/publicSnapshot.js applies it at read time.
            var (exp, _) = await _w.SeedAsync(e => e.BookingEndDate = DateTime.UtcNow.Date.AddDays(-2));
            var d = (await BuildAsync()).Experiences.Single(e => e.Id == exp.Id);
            Assert.True(d.BookingEnabled);
            Assert.Equal(exp.BookingEndDate, d.BookingEndDate);
        }

        [Fact]
        public async Task Json_HasTheNamesTheSiteReads()
        {
            var (exp, form) = await _w.SeedAsync(e => e.BookingEndDate = DateTime.UtcNow.Date.AddDays(3));
            var json = JsonSerializer.Serialize(await BuildAsync(), new JsonSerializerOptions(JsonSerializerDefaults.Web));
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            Assert.Equal(1, root.GetProperty("schemaVersion").GetInt32());
            var item = root.GetProperty("experiences").EnumerateArray()
                .Single(e => e.GetProperty("id").GetGuid() == exp.Id);
            foreach (var name in new[] { "type", "title", "contentBlocks", "bookingEnabled", "linkedFormSlug",
                         "bookingEndDate", "endDate", "startDate", "privateSlots", "price", "currency", "registrationType" })
            {
                Assert.True(item.TryGetProperty(name, out _), $"experience JSON is missing \"{name}\"");
            }
            // Date-only values: the site compares the first 10 characters.
            Assert.Matches(@"^\d{4}-\d{2}-\d{2}T", item.GetProperty("bookingEndDate").GetString());
            var formJson = root.GetProperty("forms").GetProperty(form.Slug);
            Assert.Equal(exp.Id, formJson.GetProperty("experienceId").GetGuid());
        }

        // ---- Writes that must trigger a rebuild -----------------------------------

        [Fact]
        public async Task ExperienceAndFormWrites_SignalARebuild()
        {
            var (exp, form) = await _w.SeedAsync();
            await BookingFlowTests.WasSignalledAsync(_w.Signal); // clear

            await using (var db = _w.Db())
            {
                var repo = new EfExperienceTemplateRepository(db, new Services.PublicExperienceListCache(), _w.Signal);
                var e = (await repo.GetByIdAsync(exp.Id))!;
                e.Title = "Renamed";
                await repo.UpdateAsync(e);
            }
            Assert.True(await BookingFlowTests.WasSignalledAsync(_w.Signal));

            await using (var db = _w.Db())
            {
                var repo = new EfFormTemplateRepository(db, _w.Signal);
                var f = (await repo.GetByIdAsync(form.Id))!;
                f.Title = "Renamed form";
                await repo.UpdateAsync(f);
            }
            Assert.True(await BookingFlowTests.WasSignalledAsync(_w.Signal));

            await using (var db = _w.Db())
            {
                var repo = new EfExperienceTemplateRepository(db, new Services.PublicExperienceListCache(), _w.Signal);
                await repo.CreateAsync(new ExperienceTemplate { Title = "New", CreatedByUserId = Guid.NewGuid() });
            }
            Assert.True(await BookingFlowTests.WasSignalledAsync(_w.Signal));
        }

        // ---- Seat reservation (free-form submit path) ---------------------------

        [Fact]
        public async Task TryCreateWithCapacity_TwentyAtOnce_NeverOverbooks()
        {
            var (exp, form) = await _w.SeedAsync(e => { e.CapacityTotal = 3; e.CapacityRemaining = 3; });

            var results = await Task.WhenAll(Enumerable.Range(0, 20).Select(async i =>
            {
                await using var db = _w.Db();
                var repo = new EfFormSubmissionRepository(db, _w.Signal);
                return await repo.TryCreateWithCapacityAsync(new FormSubmission
                {
                    FormTemplateId = form.Id, ExperienceTemplateId = exp.Id,
                    Status = SubmissionStatus.Submitted, SubmitterPhone = $"90000{i:00000}"
                }, exp.Id);
            }));

            Assert.Equal(3, results.Count(r => r is not null));
            Assert.Equal(0, await _w.CapacityAsync(exp.Id));
            await using var check = _w.Db();
            Assert.Equal(3, check.FormSubmissions.Count(s => s.FormTemplateId == form.Id));
        }
    }
}
