using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using ArchaeoTrails.Application.Features.Bookings;
using ArchaeoTrails.Application.Features.Payments;
using ArchaeoTrails.Application.Services;
using ArchaeoTrails.Domain.Entities;
using ArchaeoTrails.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace ArchaeoTrails.Application.Tests.Integration
{
    /// <summary>
    /// Pay Now booking flow end to end — BookingService on the real EF
    /// repositories and a real SQL Server database, with Cashfree and SMTP faked.
    /// </summary>
    [Collection(SqlCollection.Name)]
    [Trait("Category", "Sql")]
    public class BookingFlowTests
    {
        private readonly TestWorld _w;

        public BookingFlowTests(SqlTestDatabase sql) => _w = new TestWorld(sql);

        internal static async Task<bool> WasSignalledAsync(PublicSnapshotSignal signal)
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(200));
            try { await signal.WaitAsync(cts.Token); return true; }
            catch (OperationCanceledException) { return false; }
        }

        // ---- Happy paths -----------------------------------------------------

        [Fact]
        public async Task GroupBooking_PayThenStatus_ConfirmsOnce_TakesSeats_EmailsOnce_RebuildsSnapshot()
        {
            var (exp, _) = await _w.SeedAsync();

            var created = await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id, quantity: 3));
            Assert.True(created.Success, created.Message);
            var r = created.Value!;
            Assert.StartsWith("AT-", r.BookingRef);
            Assert.Equal(1500m, r.Amount);
            Assert.Equal(500m, r.UnitPrice);
            Assert.Equal("session_" + r.BookingRef, r.PaymentSessionId);
            // A hold doesn't take seats yet — only payment does.
            Assert.Equal(10, await _w.CapacityAsync(exp.Id));
            await WasSignalledAsync(_w.Signal); // clear

            // Still pending at the gateway.
            var pending = await _w.Booking().GetStatusAsync(r.BookingRef);
            Assert.Equal("PendingPayment", pending.Value!.Status);

            _w.Gateway.MarkPaid(r.BookingRef);
            var paid = await _w.Booking().GetStatusAsync(r.BookingRef.ToLowerInvariant()); // ref is case-insensitive
            Assert.Equal("Paid", paid.Value!.Status);
            Assert.Equal(7, await _w.CapacityAsync(exp.Id));
            Assert.True(await WasSignalledAsync(_w.Signal), "a paid booking must rebuild the public snapshot");

            // Polling again (status page refresh) changes nothing and sends nothing more.
            await _w.Booking().GetStatusAsync(r.BookingRef);
            Assert.Equal(7, await _w.CapacityAsync(exp.Id));
            Assert.Equal(2, await _w.EmailCountAsync(r.BookingRef, 2)); // visitor + owner, once
        }

        [Fact]
        public async Task PrivateBooking_UsesPrivatePrice_AndTakesTheDate()
        {
            var day = DateTime.UtcNow.Date.AddDays(20);
            var (exp, form) = await _w.SeedAsync(e => e.PrivateSlotsJson = $"[\"{day:yyyy-MM-dd}T00:00:00\"]");

            var created = await _w.Booking().CreatePendingAsync(
                TestWorld.Request(exp.Id, quantity: 2, type: "Private", slot: day.ToString("yyyy-MM-dd")));
            Assert.True(created.Success, created.Message);
            Assert.Equal(6000m, created.Value!.Amount);

            _w.Gateway.MarkPaid(created.Value.BookingRef);
            await _w.Booking().GetStatusAsync(created.Value.BookingRef);
            var saved = await _w.SubmissionAsync(created.Value.BookingRef);
            Assert.Equal(day, saved.BookedSlot);

            // The date is gone for the next visitor.
            var second = await _w.Booking().CreatePendingAsync(
                TestWorld.Request(exp.Id, phone: "9123456789", quantity: 2, type: "Private", slot: day.ToString("yyyy-MM-dd")));
            Assert.False(second.Success);
            Assert.Equal(BookingError.Unavailable, second.Error);
        }

        [Fact]
        public async Task LegacyIndividualType_IsTreatedAsGroup()
        {
            var (exp, _) = await _w.SeedAsync(e => e.RegistrationType = RegistrationType.Group);
            var created = await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id, type: "Individual"));
            Assert.True(created.Success, created.Message);
        }

        // ---- Booking end date (the 20 Nov fix) --------------------------------

        [Fact]
        public async Task BookingEndDateToday_IsStillOpen()
        {
            var todayIst = (DateTime.UtcNow + TimeSpan.FromHours(5.5)).Date;
            var (exp, _) = await _w.SeedAsync(e => e.BookingEndDate = todayIst);
            var created = await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id));
            Assert.True(created.Success, created.Message);
        }

        [Fact]
        public async Task BookingEndDateYesterday_IsClosed()
        {
            var yesterdayIst = (DateTime.UtcNow + TimeSpan.FromHours(5.5)).Date.AddDays(-1);
            var (exp, _) = await _w.SeedAsync(e => e.BookingEndDate = yesterdayIst);
            var created = await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id));
            Assert.False(created.Success);
            Assert.Equal(BookingError.Unavailable, created.Error);
        }

        // ---- Rejections ------------------------------------------------------

        [Theory]
        [InlineData(ExperienceStatus.Draft)]
        [InlineData(ExperienceStatus.AwaitingApproval)]
        [InlineData(ExperienceStatus.Closed)]
        public async Task NotPublished_IsNotFound(ExperienceStatus status)
        {
            var (exp, _) = await _w.SeedAsync(e => e.Status = status);
            var r = await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id));
            Assert.Equal(BookingError.NotFound, r.Error);
        }

        [Fact]
        public async Task UnknownExperience_IsNotFound()
        {
            var r = await _w.Booking().CreatePendingAsync(TestWorld.Request(Guid.NewGuid()));
            Assert.Equal(BookingError.NotFound, r.Error);
        }

        [Fact]
        public async Task FreeExperience_IsRejected()
        {
            var (exp, _) = await _w.SeedAsync(e => e.RequiresPayment = false);
            var r = await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id));
            Assert.Equal(BookingError.Invalid, r.Error);
        }

        [Fact]
        public async Task NoLinkedForm_IsUnavailable()
        {
            var (exp, _) = await _w.SeedAsync(linkForm: false);
            var r = await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id));
            Assert.Equal(BookingError.Unavailable, r.Error);
        }

        [Fact]
        public async Task InactiveForm_IsUnavailable()
        {
            var (exp, _) = await _w.SeedAsync(formActive: false);
            var r = await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id));
            Assert.Equal(BookingError.Unavailable, r.Error);
        }

        [Fact]
        public async Task PaymentsPaused_IsUnavailable()
        {
            var (exp, _) = await _w.SeedAsync();
            _w.Settings.Current.IsEnabled = false;
            var r = await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id));
            Assert.Equal(BookingError.Unavailable, r.Error);
        }

        [Theory]
        [InlineData("12345")]
        [InlineData("")]
        [InlineData("abcdefghij")]
        [InlineData("5876543210")] // Indian mobiles start 6-9
        public async Task BadPhone_IsInvalid(string phone)
        {
            var (exp, _) = await _w.SeedAsync();
            var r = await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id, phone: phone));
            Assert.Equal(BookingError.Invalid, r.Error);
        }

        [Theory]
        [InlineData("+91 98765 43210")]
        [InlineData("09876543210")]
        public async Task PhoneWithPrefixOrSpaces_IsAccepted(string phone)
        {
            var (exp, _) = await _w.SeedAsync();
            var r = await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id, phone: phone));
            Assert.True(r.Success, r.Message);
        }

        [Fact]
        public async Task MissingRequiredAnswer_IsInvalid_AndNamesTheField()
        {
            var (exp, _) = await _w.SeedAsync();
            var req = TestWorld.Request(exp.Id);
            req.FormData.Clear();
            var r = await _w.Booking().CreatePendingAsync(req);
            Assert.Equal(BookingError.Invalid, r.Error);
            Assert.Contains("Full name", r.Message);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(-1)]
        [InlineData(51)]
        public async Task QuantityOutOfRange_IsInvalid(int quantity)
        {
            var (exp, _) = await _w.SeedAsync(e => { e.CapacityRemaining = null; e.CapacityTotal = null; });
            var r = await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id, quantity: quantity));
            Assert.Equal(BookingError.Invalid, r.Error);
        }

        [Fact]
        public async Task PrivateBelowMinimumPeople_IsInvalid()
        {
            var day = DateTime.UtcNow.Date.AddDays(20);
            var (exp, _) = await _w.SeedAsync(e => { e.PrivateMinPeople = 4; e.PrivateSlotsJson = $"[\"{day:yyyy-MM-dd}T00:00:00\"]"; });
            var r = await _w.Booking().CreatePendingAsync(
                TestWorld.Request(exp.Id, quantity: 3, type: "Private", slot: day.ToString("yyyy-MM-dd")));
            Assert.Equal(BookingError.Invalid, r.Error);
        }

        [Theory]
        [InlineData(RegistrationType.Group, "Private")]
        [InlineData(RegistrationType.Private, "Group")]
        [InlineData(RegistrationType.Both, "Both")]
        [InlineData(RegistrationType.Both, "Nonsense")]
        public async Task TypeNotOffered_IsInvalid(RegistrationType offered, string requested)
        {
            var (exp, _) = await _w.SeedAsync(e => e.RegistrationType = offered);
            var r = await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id, quantity: 2, type: requested));
            Assert.Equal(BookingError.Invalid, r.Error);
        }

        [Theory]
        [InlineData(null)]
        [InlineData("not-a-date")]
        public async Task PrivateWithoutValidDate_IsInvalid(string? slot)
        {
            var (exp, _) = await _w.SeedAsync(e => e.PrivateSlotsJson = $"[\"{DateTime.UtcNow.Date.AddDays(9):yyyy-MM-dd}T00:00:00\"]");
            var r = await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id, quantity: 2, type: "Private", slot: slot));
            Assert.Equal(BookingError.Invalid, r.Error);
        }

        [Fact]
        public async Task PrivateDateNotOffered_IsUnavailable()
        {
            var (exp, _) = await _w.SeedAsync(e => e.PrivateSlotsJson = $"[\"{DateTime.UtcNow.Date.AddDays(9):yyyy-MM-dd}T00:00:00\"]");
            var r = await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id, quantity: 2, type: "Private",
                slot: DateTime.UtcNow.Date.AddDays(30).ToString("yyyy-MM-dd")));
            Assert.Equal(BookingError.Unavailable, r.Error);
        }

        [Fact]
        public async Task ZeroPrice_IsInvalid()
        {
            var (exp, _) = await _w.SeedAsync(e => e.Price = 0);
            var r = await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id));
            Assert.Equal(BookingError.Invalid, r.Error);
        }

        // ---- Capacity and holds -----------------------------------------------

        [Fact]
        public async Task OtherPeoplesHolds_CountAgainstCapacity()
        {
            var (exp, _) = await _w.SeedAsync(e => { e.CapacityTotal = 5; e.CapacityRemaining = 5; });

            Assert.True((await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id, phone: "9000000001", quantity: 4))).Success);

            var tooMany = await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id, phone: "9000000002", quantity: 2));
            Assert.Equal(BookingError.Unavailable, tooMany.Error);
            Assert.Contains("only 1 spot left", tooMany.Message);

            Assert.True((await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id, phone: "9000000003", quantity: 1))).Success);

            var full = await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id, phone: "9000000004"));
            Assert.Contains("fully booked", full.Message);
        }

        [Fact]
        public async Task SoldOut_IsUnavailable()
        {
            var (exp, _) = await _w.SeedAsync(e => e.CapacityRemaining = 0);
            var r = await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id));
            Assert.Equal(BookingError.Unavailable, r.Error);
        }

        [Fact]
        public async Task ExpiredHolds_DoNotBlockSeats()
        {
            var (exp, form) = await _w.SeedAsync(e => { e.CapacityTotal = 1; e.CapacityRemaining = 1; });
            await using (var db = _w.Db())
            {
                db.FormSubmissions.Add(new FormSubmission
                {
                    BookingRef = "AT-OLD" + Guid.NewGuid().ToString("N")[..4].ToUpperInvariant(),
                    FormTemplateId = form.Id, ExperienceTemplateId = exp.Id, Quantity = 1,
                    Status = SubmissionStatus.PendingPayment, ExpiresAt = DateTime.UtcNow.AddMinutes(-1),
                    SubmitterPhone = "9111111111", PaymentGateway = "cashfree"
                });
                await db.SaveChangesAsync();
            }
            var r = await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id));
            Assert.True(r.Success, r.Message);
        }

        [Fact]
        public async Task SameVisitorRetrying_ReleasesTheirOwnHold()
        {
            var (exp, _) = await _w.SeedAsync(e => { e.CapacityTotal = 2; e.CapacityRemaining = 2; });

            var first = await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id, quantity: 2));
            Assert.True(first.Success);
            // Reload and try again: their own 2-seat hold must not block them.
            var second = await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id, quantity: 2));
            Assert.True(second.Success, second.Message);
            Assert.NotEqual(first.Value!.BookingRef, second.Value!.BookingRef);
            Assert.Contains(first.Value.BookingRef, _w.Gateway.Terminated);
            Assert.Equal(SubmissionStatus.Expired, (await _w.SubmissionAsync(first.Value.BookingRef)).Status);
        }

        [Fact]
        public async Task SameVisitorRetrying_AfterPaying_GetsTheirPaidBooking()
        {
            var (exp, _) = await _w.SeedAsync();
            var first = await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id));
            _w.Gateway.MarkPaid(first.Value!.BookingRef);

            var second = await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id));
            Assert.True(second.Success);
            Assert.True(second.Value!.AlreadyPaid);
            Assert.Equal(first.Value.BookingRef, second.Value.BookingRef);
            Assert.Equal(SubmissionStatus.Paid, (await _w.SubmissionAsync(first.Value.BookingRef)).Status);
        }

        [Fact]
        public async Task SameVisitorRetrying_WhileGatewayRefusesCancel_IsAskedToWait()
        {
            var (exp, _) = await _w.SeedAsync();
            await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id));
            _w.Gateway.RefuseTerminate = true;
            var second = await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id));
            Assert.Equal(BookingError.Unavailable, second.Error);
            Assert.Contains("still being processed", second.Message);
        }

        [Fact]
        public async Task GatewayDown_ReleasesTheHoldImmediately()
        {
            var (exp, form) = await _w.SeedAsync(e => { e.CapacityTotal = 1; e.CapacityRemaining = 1; });
            _w.Gateway.FailCreate = true;
            var r = await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id));
            Assert.Equal(BookingError.Gateway, r.Error);

            await using var db = _w.Db();
            var saved = await db.FormSubmissions.AsNoTracking().SingleAsync(s => s.FormTemplateId == form.Id);
            Assert.Equal(SubmissionStatus.Failed, saved.Status);

            _w.Gateway.FailCreate = false;
            Assert.True((await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id, phone: "9222222222"))).Success);
        }

        [Fact]
        public async Task UnderpaidOrder_IsNotConfirmed()
        {
            var (exp, _) = await _w.SeedAsync();
            var r = (await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id, quantity: 2))).Value!;
            _w.Gateway.MarkPaid(r.BookingRef, amount: 1m);
            var status = await _w.Booking().GetStatusAsync(r.BookingRef);
            Assert.Equal("PendingPayment", status.Value!.Status);
            Assert.Equal(10, await _w.CapacityAsync(exp.Id));
        }

        [Fact]
        public async Task UnknownBookingRef_IsNotFound()
        {
            Assert.Equal(BookingError.NotFound, (await _w.Booking().GetStatusAsync("AT-NOPE99")).Error);
            Assert.Equal(BookingError.NotFound, (await _w.Booking().GetStatusAsync("")).Error);
        }

        // ---- Retry payment -----------------------------------------------------

        [Fact]
        public async Task Retry_ActiveOrder_ReturnsSameSession()
        {
            var (exp, _) = await _w.SeedAsync();
            var r = (await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id, quantity: 2))).Value!;
            var retry = await _w.Booking().RetryPaymentAsync(r.BookingRef);
            Assert.True(retry.Success);
            Assert.Equal(r.PaymentSessionId, retry.Value!.PaymentSessionId);
            Assert.Equal(1000m, retry.Value.Amount);
            Assert.Equal(500m, retry.Value.UnitPrice);
        }

        [Fact]
        public async Task Retry_PaidOrder_ConfirmsAndSaysAlreadyPaid()
        {
            var (exp, _) = await _w.SeedAsync();
            var r = (await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id))).Value!;
            _w.Gateway.MarkPaid(r.BookingRef);
            var retry = await _w.Booking().RetryPaymentAsync(r.BookingRef);
            Assert.True(retry.Value!.AlreadyPaid);
            Assert.Equal(9, await _w.CapacityAsync(exp.Id));
        }

        [Fact]
        public async Task Retry_OrderExpiredAtGateway_MarksExpired()
        {
            var (exp, _) = await _w.SeedAsync();
            var r = (await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id))).Value!;
            _w.Gateway.Orders[r.BookingRef].Status = "EXPIRED";
            var retry = await _w.Booking().RetryPaymentAsync(r.BookingRef);
            Assert.Equal(BookingError.Unavailable, retry.Error);
            Assert.Equal(SubmissionStatus.Expired, (await _w.SubmissionAsync(r.BookingRef)).Status);
        }

        [Fact]
        public async Task Retry_GatewayUnreachable_IsGatewayError()
        {
            var (exp, _) = await _w.SeedAsync();
            var r = (await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id))).Value!;
            _w.Gateway.Orders[r.BookingRef] = new GatewayOrderStatus { Unavailable = true };
            Assert.Equal(BookingError.Gateway, (await _w.Booking().RetryPaymentAsync(r.BookingRef)).Error);
        }

        // ---- Webhooks ------------------------------------------------------------

        private Task<WebhookResult> Webhook(string? orderId, bool valid = true, string? paymentId = "pay_1")
        {
            _w.Gateway.NextWebhook = new GatewayWebhookEvent { SignatureValid = valid, OrderId = orderId, PaymentId = paymentId, EventType = "PAYMENT_SUCCESS_WEBHOOK" };
            return _w.Booking().HandleGatewayWebhookAsync("{}", "ts", "sig");
        }

        [Fact]
        public async Task Webhook_BadSignature_IsRejected_AndNotStored()
        {
            var result = await Webhook("AT-WHATEVER", valid: false);
            Assert.Equal(WebhookOutcome.InvalidSignature, result.Outcome);
        }

        [Fact]
        public async Task Webhook_Paid_ConfirmsOnce_EvenIfDelivered_Twice()
        {
            var (exp, _) = await _w.SeedAsync();
            var r = (await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id, quantity: 2))).Value!;
            _w.Gateway.MarkPaid(r.BookingRef);

            Assert.Equal("Confirmed.", (await Webhook(r.BookingRef)).Message);
            Assert.Equal("Already confirmed.", (await Webhook(r.BookingRef)).Message);

            var saved = await _w.SubmissionAsync(r.BookingRef);
            Assert.Equal(SubmissionStatus.Paid, saved.Status);
            Assert.Equal("pay_1", saved.GatewayPaymentId);
            Assert.Equal(8, await _w.CapacityAsync(exp.Id));
            Assert.Equal(2, await _w.EmailCountAsync(r.BookingRef, 2));

            await using var db = _w.Db();
            Assert.Equal(2, await db.PaymentWebhookEvents.CountAsync(e => e.GatewayOrderId == r.BookingRef && e.ProcessedAt != null));
        }

        [Fact]
        public async Task Webhook_NotPaidYet_LeavesBookingOpen()
        {
            var (exp, _) = await _w.SeedAsync();
            var r = (await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id))).Value!;
            var result = await Webhook(r.BookingRef);
            Assert.Contains("nothing to confirm", result.Message);
            Assert.Equal(SubmissionStatus.PendingPayment, (await _w.SubmissionAsync(r.BookingRef)).Status);
        }

        [Fact]
        public async Task Webhook_GatewayUnreachable_AsksCashfreeToRetry()
        {
            var (exp, _) = await _w.SeedAsync();
            var r = (await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id))).Value!;
            _w.Gateway.Orders[r.BookingRef] = new GatewayOrderStatus { Unavailable = true };
            Assert.Equal(WebhookOutcome.RetryLater, (await Webhook(r.BookingRef)).Outcome);
        }

        [Fact]
        public async Task Webhook_Underpaid_IsNotConfirmed()
        {
            var (exp, _) = await _w.SeedAsync();
            var r = (await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id))).Value!;
            _w.Gateway.MarkPaid(r.BookingRef, amount: 10m);
            Assert.Contains("NOT confirmed", (await Webhook(r.BookingRef)).Message);
            Assert.Equal(SubmissionStatus.PendingPayment, (await _w.SubmissionAsync(r.BookingRef)).Status);
        }

        [Theory]
        [InlineData(null)]
        [InlineData("AT-UNKNOWN")]
        public async Task Webhook_NoOrUnknownOrder_IsIgnored(string? orderId)
        {
            Assert.Equal(WebhookOutcome.Handled, (await Webhook(orderId)).Outcome);
        }

        [Fact]
        public async Task Webhook_PaidAfterHoldExpired_StillConfirms_AndFlagsIt()
        {
            var (exp, _) = await _w.SeedAsync();
            var r = (await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id))).Value!;
            await using (var db = _w.Db())
            {
                await db.FormSubmissions.Where(s => s.BookingRef == r.BookingRef)
                    .ExecuteUpdateAsync(s => s.SetProperty(x => x.Status, SubmissionStatus.Expired));
            }
            _w.Gateway.MarkPaid(r.BookingRef);
            Assert.Contains("paid after its hold expired", (await Webhook(r.BookingRef)).Message);
            Assert.Equal(SubmissionStatus.Paid, (await _w.SubmissionAsync(r.BookingRef)).Status);
        }

        // ---- Expiry sweep ---------------------------------------------------------

        [Fact]
        public async Task ExpirySweep_ExpiresStaleHolds_ButConfirmsOnesPaidAtGateway()
        {
            var (exp, _) = await _w.SeedAsync();
            _w.Options.HoldMinutes = 1;
            var unpaid = (await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id, phone: "9333333331"))).Value!;
            var paidLate = (await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id, phone: "9333333332"))).Value!;
            var unknown = (await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id, phone: "9333333333"))).Value!;
            await using (var db = _w.Db())
            {
                var refs = new[] { unpaid.BookingRef, paidLate.BookingRef, unknown.BookingRef };
                await db.FormSubmissions.Where(s => refs.Contains(s.BookingRef))
                    .ExecuteUpdateAsync(s => s.SetProperty(x => x.ExpiresAt, DateTime.UtcNow.AddMinutes(-5)));
            }
            _w.Gateway.MarkPaid(paidLate.BookingRef);
            _w.Gateway.Orders[unknown.BookingRef] = new GatewayOrderStatus { Unavailable = true };

            await _w.Booking().ExpireStaleHoldsAsync();

            Assert.Equal(SubmissionStatus.Expired, (await _w.SubmissionAsync(unpaid.BookingRef)).Status);
            Assert.Contains(unpaid.BookingRef, _w.Gateway.Terminated);
            Assert.Equal(SubmissionStatus.Paid, (await _w.SubmissionAsync(paidLate.BookingRef)).Status);
            Assert.Equal(SubmissionStatus.PendingPayment, (await _w.SubmissionAsync(unknown.BookingRef)).Status); // next sweep

            var status = await _w.Booking().GetStatusAsync(unpaid.BookingRef);
            Assert.Equal("Expired", status.Value!.Status);
        }

        // ---- Races ------------------------------------------------------------------

        [Fact]
        public async Task StatusPollAndWebhookRacing_ConfirmExactlyOnce()
        {
            var (exp, _) = await _w.SeedAsync();
            var r = (await _w.Booking().CreatePendingAsync(TestWorld.Request(exp.Id, quantity: 3))).Value!;
            _w.Gateway.MarkPaid(r.BookingRef);

            await Task.WhenAll(Enumerable.Range(0, 8).Select(i => i % 2 == 0
                ? (Task)_w.Booking().GetStatusAsync(r.BookingRef)
                : Webhook(r.BookingRef)));

            Assert.Equal(7, await _w.CapacityAsync(exp.Id)); // 10 − 3, not 10 − 3×n
            Assert.Equal(2, await _w.EmailCountAsync(r.BookingRef, 2));
        }
    }
}
