using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Threading.Tasks;
using ArchaeoTrails.Application.Features.Bookings;
using ArchaeoTrails.Application.Features.Contact;
using ArchaeoTrails.Application.Features.Payments;
using ArchaeoTrails.Application.Interfaces;
using ArchaeoTrails.Application.Services;
using ArchaeoTrails.Domain.Entities;
using ArchaeoTrails.Domain.Enums;
using ArchaeoTrails.Infrastructure.Data;
using ArchaeoTrails.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;

namespace ArchaeoTrails.Application.Tests.Integration
{
    /// <summary>
    /// A throwaway SQL Server database on LocalDB, built from the real EF
    /// migrations — so ExecuteUpdate, transactions and row locks behave like
    /// Azure SQL (EF InMemory can't run them). Dropped when the run ends.
    /// Override the server with ARCHAEOTRAILS_TEST_SQL (a connection string
    /// without Initial Catalog).
    /// </summary>
    public sealed class SqlTestDatabase : IAsyncLifetime
    {
        private readonly string _connectionString;

        public SqlTestDatabase()
        {
            var server = Environment.GetEnvironmentVariable("ARCHAEOTRAILS_TEST_SQL")
                ?? @"Server=(localdb)\MSSQLLocalDB;Integrated Security=true;TrustServerCertificate=True";
            _connectionString = $"{server};Initial Catalog=ArchaeoTrailsTests_{Guid.NewGuid():N}";
        }

        public AppDbContext NewContext() =>
            new(new DbContextOptionsBuilder<AppDbContext>()
                .UseSqlServer(_connectionString, sql => sql.EnableRetryOnFailure())
                .Options);

        public async Task InitializeAsync()
        {
            await using var db = NewContext();
            await db.Database.MigrateAsync();
        }

        public async Task DisposeAsync()
        {
            await using var db = NewContext();
            await db.Database.EnsureDeletedAsync();
        }
    }

    [CollectionDefinition(Name)]
    public class SqlCollection : ICollectionFixture<SqlTestDatabase>
    {
        public const string Name = "sql";
    }

    /// <summary>Scripted Cashfree stand-in: order status per order id.</summary>
    public sealed class FakeGateway : IPaymentGateway
    {
        public string Name => "cashfree";
        public bool FailCreate { get; set; }
        public bool RefuseTerminate { get; set; }
        public ConcurrentDictionary<string, GatewayOrderStatus> Orders { get; } = new();
        public List<string> Terminated { get; } = new();
        public GatewayWebhookEvent NextWebhook { get; set; } = new() { SignatureValid = true };

        public Task<GatewayOrderResult> CreateOrderAsync(GatewayOrderRequest request)
        {
            if (FailCreate) return Task.FromResult(new GatewayOrderResult { Success = false, Error = "boom" });
            Orders[request.OrderId] = new GatewayOrderStatus { Found = true, Status = "ACTIVE", Amount = request.Amount, Currency = request.Currency };
            return Task.FromResult(new GatewayOrderResult { Success = true, PaymentSessionId = "session_" + request.OrderId });
        }

        public Task<GatewayOrderStatus> GetOrderStatusAsync(string orderId, PaymentEnvironment environment) =>
            Task.FromResult(Orders.TryGetValue(orderId, out var s) ? s : new GatewayOrderStatus { Found = false });

        public Task<bool> TerminateOrderAsync(string orderId, PaymentEnvironment environment)
        {
            if (RefuseTerminate) return Task.FromResult(false);
            Terminated.Add(orderId);
            if (Orders.TryGetValue(orderId, out var s)) s.Status = "TERMINATED";
            return Task.FromResult(true);
        }

        public GatewayWebhookEvent ParseWebhook(string rawBody, string? timestamp, string? signature) => NextWebhook;

        public void MarkPaid(string orderId, decimal? amount = null)
        {
            var s = Orders[orderId];
            s.Status = "PAID";
            if (amount.HasValue) s.Amount = amount.Value;
        }
    }

    public sealed class FakeSettings : IPaymentSettingsService
    {
        public PaymentSettings Current { get; } = new() { IsEnabled = true };
        public Task<PaymentSettings> GetCurrentEntityAsync() => Task.FromResult(Current);
        public Task<PaymentSettingsDto> GetAsync() => throw new NotSupportedException();
        public Task<PaymentSettingsResult> UpdateAsync(UpdatePaymentSettingsRequest request, Guid updatedByUserId) => throw new NotSupportedException();
    }

    public sealed class FakeEmail : IEmailService
    {
        public ConcurrentBag<string> Sent { get; } = new();
        public Task<bool> SendContactEmailAsync(ContactRequest request) { Sent.Add("contact"); return Task.FromResult(true); }
        public Task<bool> SendFormSubmissionOwnerEmailAsync(FormTemplate form, FormSubmission submission) { Sent.Add("form-owner"); return Task.FromResult(true); }
        public Task<bool> SendFormSubmissionConfirmationEmailAsync(FormTemplate form, FormSubmission submission) { Sent.Add("form-confirm"); return Task.FromResult(true); }
        public Task<bool> SendBookingConfirmationEmailAsync(BookingConfirmationEmail booking) { Sent.Add("booking-confirm:" + booking.BookingRef); return Task.FromResult(true); }
        public Task<bool> SendBookingOwnerEmailAsync(BookingConfirmationEmail booking) { Sent.Add("booking-owner:" + booking.BookingRef); return Task.FromResult(true); }
    }

    /// <summary>Seeds rows and builds services wired to the real EF repositories.</summary>
    public sealed class TestWorld
    {
        private readonly SqlTestDatabase _sql;
        public FakeGateway Gateway { get; } = new();
        public FakeSettings Settings { get; } = new();
        public FakeEmail Email { get; } = new();
        public PublicSnapshotSignal Signal { get; } = new();
        public BookingOptions Options { get; } = new() { HoldMinutes = 20, ExpiryGraceMinutes = 0 };

        public TestWorld(SqlTestDatabase sql) => _sql = sql;

        public AppDbContext Db() => _sql.NewContext();

        /// <summary>A fresh BookingService per call — one DbContext per "request", like ASP.NET scopes.</summary>
        public BookingService Booking()
        {
            var db = Db();
            return new BookingService(
                new EfExperienceTemplateRepository(db, new PublicExperienceListCache(), Signal),
                new EfFormTemplateRepository(db, Signal),
                new EfFormSubmissionRepository(db, Signal),
                new EfPaymentWebhookEventRepository(db),
                Gateway, Settings, Email, Options, new BookingHoldTracker());
        }

        public const string NameField = "fullName";

        public async Task<(ExperienceTemplate Experience, FormTemplate Form)> SeedAsync(Action<ExperienceTemplate>? tweak = null,
            bool formActive = true, bool linkForm = true)
        {
            var form = new FormTemplate
            {
                Title = "Registration",
                Slug = "reg-" + Guid.NewGuid().ToString("N")[..10],
                // PascalCase, as FormsController stores it (JsonSerializer defaults).
                FieldsJson = $"[{{\"Id\":\"f1\",\"Name\":\"{NameField}\",\"Label\":\"Full name\",\"Type\":\"text\",\"Required\":true}}]",
                RequiresPayment = true,
                Price = 1,
                IsActive = formActive
            };
            var experience = new ExperienceTemplate
            {
                Type = ExperienceType.Walk,
                Status = ExperienceStatus.Published,
                Title = "Heritage walk " + Guid.NewGuid().ToString("N")[..6],
                RequiresPayment = true,
                Price = 500,
                PrivatePrice = 3000,
                CapacityTotal = 10,
                CapacityRemaining = 10,
                RegistrationType = RegistrationType.Both,
                PrivateMinPeople = 2,
                StartDate = DateTime.UtcNow.Date.AddDays(10),
                EndDate = DateTime.UtcNow.Date.AddDays(10),
                LinkedFormTemplateId = linkForm ? form.Id : null,
                CreatedByUserId = Guid.NewGuid()
            };
            tweak?.Invoke(experience);

            await using var db = Db();
            db.FormTemplates.Add(form);
            db.ExperienceTemplates.Add(experience);
            await db.SaveChangesAsync();
            return (experience, form);
        }

        public static CreateBookingRequest Request(Guid experienceId, string phone = "9876543210", int quantity = 1,
            string type = "Group", string? slot = null) => new()
        {
            ExperienceId = experienceId,
            RegistrationType = type,
            Quantity = quantity,
            Slot = slot,
            SubmitterName = "Asha Rao",
            SubmitterEmail = "asha@example.com",
            SubmitterPhone = phone,
            FormData = new Dictionary<string, string> { [NameField] = "Asha Rao" }
        };

        public async Task<int?> CapacityAsync(Guid experienceId)
        {
            await using var db = Db();
            return (await db.ExperienceTemplates.AsNoTracking().SingleAsync(e => e.Id == experienceId)).CapacityRemaining;
        }

        public async Task<FormSubmission> SubmissionAsync(string bookingRef)
        {
            await using var db = Db();
            return await db.FormSubmissions.AsNoTracking().SingleAsync(s => s.BookingRef == bookingRef);
        }

        /// <summary>Emails are fire-and-forget (Task.Run) — give them a moment.</summary>
        public async Task<int> EmailCountAsync(string bookingRef, int expected)
        {
            for (var i = 0; i < 50; i++)
            {
                var n = 0;
                foreach (var s in Email.Sent) if (s.EndsWith(":" + bookingRef)) n++;
                if (n >= expected) { await Task.Delay(100); break; }
                await Task.Delay(20);
            }
            var count = 0;
            foreach (var s in Email.Sent) if (s.EndsWith(":" + bookingRef)) count++;
            return count;
        }
    }
}
