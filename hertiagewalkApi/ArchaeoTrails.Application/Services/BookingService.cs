using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Security.Cryptography;
using System.Text.Json;
using System.Threading.Tasks;
using ArchaeoTrails.Application.Features.Bookings;
using ArchaeoTrails.Application.Features.Forms;
using ArchaeoTrails.Application.Features.Payments;
using ArchaeoTrails.Application.Interfaces;
using ArchaeoTrails.Domain.Entities;
using ArchaeoTrails.Domain.Enums;

namespace ArchaeoTrails.Application.Services
{
    /// <summary>Booking settings — bound from the "Bookings" config section in Program.cs.</summary>
    public class BookingOptions
    {
        /// <summary>How long an unpaid booking holds its seats / Private date.</summary>
        public int HoldMinutes { get; set; } = 20;

        /// <summary>
        /// Extra wait after a hold ends before the expiry worker gives up on it —
        /// lets a payment the bank approved right at the deadline land first.
        /// </summary>
        public int ExpiryGraceMinutes { get; set; } = 5;

        /// <summary>How often the expiry worker sweeps for holds that ran out.</summary>
        public int ExpirySweepMinutes { get; set; } = 2;

        /// <summary>
        /// Public /booking/{order_id} page, linked from the confirmation email.
        /// Program.cs fills it from Cashfree:ReturnUrl (same page).
        /// </summary>
        public string? BookingUrlTemplate { get; set; }
    }

    /// <summary>
    /// Pay Now → a PendingPayment booking + a gateway order. The amount always
    /// comes from the Experience row: Price (Group) or PrivatePrice (Private,
    /// falling back to Price), per person, times the number of people. Both
    /// prices are already final — fees are baked in by the Admin's price
    /// calculator — so nothing is added on top here.
    ///
    /// A booking is confirmed (PendingPayment → Paid, capacity − Quantity) once
    /// Cashfree reports the order PAID — asked by whichever comes first: the
    /// confirmation page (GetStatusAsync), the signed webhook
    /// (HandleGatewayWebhookAsync), or the expiry worker (ExpireStaleHoldsAsync).
    /// The call that wins sends the confirmation emails. If the visitor reloads
    /// mid-checkout and tries again, their own earlier hold is cancelled (or
    /// found paid) instead of blocking them.
    /// See docs/form-generator/CASHFREE_BOOKING_PLAN.md §5.
    /// </summary>
    public class BookingService : IBookingService
    {
        // No 0/O/1/I/L — easy to read out over the phone.
        private const string RefAlphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
        private const int RefLength = 6;
        private const int MaxQuantity = 50;
        private const int ExpiryBatchSize = 50;

        private readonly IExperienceTemplateRepository _experiences;
        private readonly IFormTemplateRepository _forms;
        private readonly IFormSubmissionRepository _submissions;
        private readonly IPaymentWebhookEventRepository _webhookEvents;
        private readonly IPaymentGateway _gateway;
        private readonly IPaymentSettingsService _paymentSettings;
        private readonly IEmailService _email;
        private readonly BookingOptions _options;

        public BookingService(
            IExperienceTemplateRepository experiences,
            IFormTemplateRepository forms,
            IFormSubmissionRepository submissions,
            IPaymentWebhookEventRepository webhookEvents,
            IPaymentGateway gateway,
            IPaymentSettingsService paymentSettings,
            IEmailService email,
            BookingOptions options)
        {
            _experiences = experiences;
            _forms = forms;
            _submissions = submissions;
            _webhookEvents = webhookEvents;
            _gateway = gateway;
            _paymentSettings = paymentSettings;
            _email = email;
            _options = options;
        }

        public async Task<BookingResult<CreateBookingResponse>> CreatePendingAsync(CreateBookingRequest request)
        {
            var now = DateTime.UtcNow;

            // ---- The experience and its registration form ----
            var experience = await _experiences.GetByIdAsync(request.ExperienceId);
            if (experience is null || experience.Status != ExperienceStatus.Published)
            {
                return Fail(BookingError.NotFound, "This experience isn't open for booking.");
            }
            if (!experience.RequiresPayment)
            {
                return Fail(BookingError.Invalid, "This experience is free — submit the registration form directly.");
            }
            if (experience.BookingEndDate is not null && experience.BookingEndDate <= now)
            {
                return Fail(BookingError.Unavailable, "Bookings for this experience have closed.");
            }
            if (experience.LinkedFormTemplateId is null)
            {
                return Fail(BookingError.Unavailable, "This experience has no registration form yet.");
            }
            var form = await _forms.GetByIdAsync(experience.LinkedFormTemplateId.Value);
            if (form is null || !form.IsActive)
            {
                return Fail(BookingError.Unavailable, "This experience's registration form is closed.");
            }

            var settings = await _paymentSettings.GetCurrentEntityAsync();
            if (!settings.IsEnabled)
            {
                return Fail(BookingError.Unavailable, "Online payments are paused right now. Please try again later.");
            }

            // ---- Registration type + people ----
            if (!TryParseRequestedType(request.RegistrationType, out var regType) ||
                !IsOffered(experience.RegistrationType, regType))
            {
                return Fail(BookingError.Invalid, "That registration type isn't offered for this experience.");
            }
            var quantity = request.Quantity;
            if (quantity < 1 || quantity > MaxQuantity)
            {
                return Fail(BookingError.Invalid, $"Number of people must be between 1 and {MaxQuantity}.");
            }
            if (regType == RegistrationType.Private && quantity < experience.PrivateMinPeople)
            {
                return Fail(BookingError.Invalid, $"Private bookings need at least {experience.PrivateMinPeople} people.");
            }

            // ---- Contact details + required answers ----
            var phone = BookingRules.NormalizeIndianMobile(request.SubmitterPhone);
            if (phone is null)
            {
                return Fail(BookingError.Invalid, "Please enter a valid 10-digit mobile number — it's needed for payment.");
            }
            var fields = JsonSerializer.Deserialize<List<FormFieldDefinition>>(form.FieldsJson) ?? new();
            var missing = BookingRules.FindMissingRequiredFields(fields, request.FormData);
            if (missing.Count > 0)
            {
                return Fail(BookingError.Invalid, $"Please fill in: {string.Join(", ", missing)}.");
            }

            // ---- Availability: paid bookings + other people's live holds ----
            var holds = await _submissions.GetActiveHoldsAsync(form.Id, now);

            // The same visitor trying again (reloaded the page / closed the
            // payment window): their earlier hold mustn't block them. If it was
            // actually paid, send them to it; otherwise cancel it at Cashfree
            // and release it.
            var ownHolds = holds.Where(h => h.SubmitterPhone == phone).ToList();
            foreach (var old in ownHolds)
            {
                var live = string.IsNullOrEmpty(old.GatewayOrderId)
                    ? null
                    : await _gateway.GetOrderStatusAsync(old.GatewayOrderId, settings.Environment);

                if (live is { IsPaid: true } && live.Amount >= old.AmountPaid)
                {
                    await ConfirmPaidAsync(old, experience);
                    return BookingResult<CreateBookingResponse>.Ok(AlreadyPaidResponse(old));
                }

                if (live is { Found: true, Status: "ACTIVE" } &&
                    !await _gateway.TerminateOrderAsync(old.GatewayOrderId!, settings.Environment))
                {
                    return Fail(BookingError.Unavailable,
                        $"Your earlier payment for this booking ({old.BookingRef}) is still being processed. " +
                        "Please wait a minute and try again.");
                }

                old.Status = SubmissionStatus.Expired;
                old.ExpiresAt = now;
                await _submissions.UpdateAsync(old);
            }
            holds = holds.Except(ownHolds).ToList();

            DateTime? bookedSlot = null;
            if (regType == RegistrationType.Private)
            {
                if (!TryParseSlot(request.Slot, out var slot))
                {
                    return Fail(BookingError.Invalid, "Please choose a date for your private booking.");
                }
                var taken = (await _submissions.GetBookedSlotsAsync(form.Id))
                    .Concat(holds.Where(h => h.BookedSlot.HasValue).Select(h => h.BookedSlot!.Value));
                var available = BookingRules.AvailablePrivateSlots(experience.PrivateSlotsJson, taken);
                if (!available.Any(d => d.Date == slot.Date))
                {
                    return Fail(BookingError.Unavailable, "Sorry, that date is no longer available. Please choose another.");
                }
                bookedSlot = slot.Date;
            }

            if (experience.CapacityRemaining.HasValue)
            {
                var free = experience.CapacityRemaining.Value - holds.Sum(h => h.Quantity);
                if (free < quantity)
                {
                    return Fail(BookingError.Unavailable, free <= 0
                        ? "Sorry, this is fully booked."
                        : $"Sorry, only {free} spot{(free == 1 ? "" : "s")} left.");
                }
            }

            // ---- Amount — from the database only ----
            var unitPrice = regType == RegistrationType.Private
                ? experience.PrivatePrice ?? experience.Price
                : experience.Price;
            var amount = decimal.Round(unitPrice * quantity, 2, MidpointRounding.AwayFromZero);
            if (amount < 1m)
            {
                return Fail(BookingError.Invalid, "This experience has no price set yet.");
            }

            // ---- Save the pending booking, then open the gateway order ----
            var bookingRef = await NewBookingRefAsync();
            var expiresAt = now.AddMinutes(Math.Max(1, _options.HoldMinutes));
            // Cashfree rejects an order_expiry_time under 15 min away, so a shorter
            // hold (e.g. 2 min while testing) keeps the gateway order open a little
            // longer; the expiry worker terminates it once the hold has run out.
            var gatewayExpiresAt = now.AddMinutes(Math.Max(16, _options.HoldMinutes));
            var submission = new FormSubmission
            {
                BookingRef = bookingRef,
                FormTemplateId = form.Id,
                ExperienceTemplateId = experience.Id,
                DataJson = JsonSerializer.Serialize(request.FormData),
                SubmitterName = Trim(request.SubmitterName, 200),
                SubmitterEmail = Trim(request.SubmitterEmail, 200),
                SubmitterPhone = phone,
                RegistrationType = regType.ToString(),
                Quantity = quantity,
                BookedSlot = bookedSlot,
                AmountPaid = amount,
                Currency = experience.Currency,
                PaymentGateway = _gateway.Name,
                GatewayOrderId = bookingRef,
                Status = SubmissionStatus.PendingPayment,
                CreatedAt = now,
                ExpiresAt = expiresAt
            };
            await _submissions.CreateAsync(submission);

            var order = await _gateway.CreateOrderAsync(new GatewayOrderRequest
            {
                OrderId = bookingRef,
                Amount = amount,
                Currency = experience.Currency,
                CustomerId = "guest_" + phone,
                CustomerName = submission.SubmitterName,
                CustomerEmail = submission.SubmitterEmail,
                CustomerPhone = phone,
                ExpiresAt = gatewayExpiresAt,
                Note =Trim($"{experience.Title} — {regType} × {quantity}", 200),
                Environment = settings.Environment
            });

            if (!order.Success || string.IsNullOrEmpty(order.PaymentSessionId))
            {
                // Release the hold straight away — nobody can pay this order.
                submission.Status = SubmissionStatus.Failed;
                submission.ExpiresAt = now;
                await _submissions.UpdateAsync(submission);
                return Fail(BookingError.Gateway, "We couldn't start the payment. Please try again in a moment.");
            }

            submission.GatewaySessionId = order.PaymentSessionId;
            await _submissions.UpdateAsync(submission);

            return BookingResult<CreateBookingResponse>.Ok(new CreateBookingResponse
            {
                BookingRef = bookingRef,
                PaymentSessionId = order.PaymentSessionId,
                Mode = ModeOf(settings.Environment),
                Amount = amount,
                UnitPrice = unitPrice,
                Quantity = quantity,
                Currency = experience.Currency,
                ExpiresAt = expiresAt
            });
        }

        public async Task<BookingResult<BookingStatusDto>> GetStatusAsync(string bookingRef)
        {
            var booking = await FindByRefAsync(bookingRef);
            if (booking is null)
            {
                return BookingResult<BookingStatusDto>.Fail(BookingError.NotFound, "Booking not found.");
            }

            var experience = await LoadExperienceAsync(booking);

            // While pending, ask the gateway (never trust the redirect alone) and
            // confirm once it reports PAID for the full amount.
            string? gatewayStatus = null;
            if (booking.Status == SubmissionStatus.PendingPayment && !string.IsNullOrEmpty(booking.GatewayOrderId))
            {
                var settings = await _paymentSettings.GetCurrentEntityAsync();
                var live = await _gateway.GetOrderStatusAsync(booking.GatewayOrderId, settings.Environment);
                gatewayStatus = live.Found ? live.Status : null;

                if (gatewayStatus == "PAID" && live.Amount >= booking.AmountPaid)
                {
                    await ConfirmPaidAsync(booking, experience);
                }
            }

            var status = booking.Status == SubmissionStatus.PendingPayment && booking.ExpiresAt <= DateTime.UtcNow
                && gatewayStatus is not "PAID"
                ? SubmissionStatus.Expired
                : booking.Status;

            return BookingResult<BookingStatusDto>.Ok(new BookingStatusDto
            {
                BookingRef = booking.BookingRef!,
                Status = status.ToString(),
                GatewayStatus = gatewayStatus,
                ExperienceId = experience?.Id,
                ExperienceTitle = experience?.Title,
                RegistrationType = booking.RegistrationType,
                Quantity = booking.Quantity,
                BookedSlot = booking.BookedSlot,
                ExperienceDate = booking.BookedSlot ?? experience?.StartDate,
                Amount = booking.AmountPaid,
                Currency = booking.Currency,
                SubmitterFirstName = booking.SubmitterName?.Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault(),
                CreatedAt = AsUtc(booking.CreatedAt),
                ExpiresAt = AsUtc(booking.ExpiresAt),
                PaidAt = AsUtc(booking.PaidAt)
            });
        }

        public async Task<BookingResult<CreateBookingResponse>> RetryPaymentAsync(string bookingRef)
        {
            var booking = await FindByRefAsync(bookingRef);
            if (booking is null)
            {
                return Fail(BookingError.NotFound, "Booking not found.");
            }
            if (booking.Status is SubmissionStatus.Paid or SubmissionStatus.Submitted)
            {
                return BookingResult<CreateBookingResponse>.Ok(AlreadyPaidResponse(booking));
            }

            const string expiredMessage = "This booking's hold has expired, so the spot was released. Please book again.";
            if (booking.Status != SubmissionStatus.PendingPayment || booking.ExpiresAt is null ||
                booking.ExpiresAt <= DateTime.UtcNow || string.IsNullOrEmpty(booking.GatewaySessionId))
            {
                return Fail(BookingError.Unavailable, expiredMessage);
            }

            var settings = await _paymentSettings.GetCurrentEntityAsync();
            var live = await _gateway.GetOrderStatusAsync(booking.GatewayOrderId, settings.Environment);
            if (live.IsPaid && live.Amount >= booking.AmountPaid)
            {
                await ConfirmPaidAsync(booking, await LoadExperienceAsync(booking));
                return BookingResult<CreateBookingResponse>.Ok(AlreadyPaidResponse(booking));
            }
            if (live.Unavailable)
            {
                return Fail(BookingError.Gateway, "We couldn't reach the payment gateway. Please try again in a moment.");
            }
            if (!live.IsActive)
            {
                // Expired / cancelled at the gateway — the session can't be paid any more.
                await _submissions.TryMarkExpiredAsync(booking.Id);
                return Fail(BookingError.Unavailable, expiredMessage);
            }

            // Same order, same session — the amount and hold stay exactly as booked.
            return BookingResult<CreateBookingResponse>.Ok(new CreateBookingResponse
            {
                BookingRef = booking.BookingRef!,
                PaymentSessionId = booking.GatewaySessionId!,
                Mode = ModeOf(settings.Environment),
                Amount = booking.AmountPaid,
                UnitPrice = booking.Quantity > 0
                    ? decimal.Round(booking.AmountPaid / booking.Quantity, 2, MidpointRounding.AwayFromZero)
                    : booking.AmountPaid,
                Quantity = booking.Quantity,
                Currency = booking.Currency,
                ExpiresAt = AsUtc(booking.ExpiresAt.Value)
            });
        }

        public async Task<WebhookResult> HandleGatewayWebhookAsync(string rawBody, string? timestamp, string? signature)
        {
            var parsed = _gateway.ParseWebhook(rawBody, timestamp, signature);
            if (!parsed.SignatureValid)
            {
                return new WebhookResult { Outcome = WebhookOutcome.InvalidSignature, Message = "Invalid webhook signature." };
            }

            // Stored before acting on it, so even a crash below leaves a trace.
            var webhookEvent = new PaymentWebhookEvent
            {
                Gateway = _gateway.Name,
                EventType = Trim(parsed.EventType, 100),
                GatewayOrderId = Trim(parsed.OrderId, 100),
                RawBody = rawBody,
                ReceivedAt = DateTime.UtcNow
            };
            await _webhookEvents.AddAsync(webhookEvent);

            var (outcome, note) = await ReconcileFromWebhookAsync(parsed);

            webhookEvent.Outcome = Trim(note, 500);
            if (outcome != WebhookOutcome.RetryLater) webhookEvent.ProcessedAt = DateTime.UtcNow;
            await _webhookEvents.UpdateAsync(webhookEvent);

            return new WebhookResult { Outcome = outcome, OrderId = parsed.OrderId, Message = note };
        }

        public async Task<int> ExpireStaleHoldsAsync()
        {
            var cutoff = DateTime.UtcNow.AddMinutes(-Math.Max(0, _options.ExpiryGraceMinutes));
            var stale = await _submissions.GetStalePendingAsync(_gateway.Name, cutoff, ExpiryBatchSize);
            if (stale.Count == 0) return 0;

            var settings = await _paymentSettings.GetCurrentEntityAsync();
            var expired = 0;
            foreach (var booking in stale)
            {
                // Ask the gateway before giving up on it: a webhook may have been
                // missed for a payment that did go through.
                if (!string.IsNullOrEmpty(booking.GatewayOrderId))
                {
                    var live = await _gateway.GetOrderStatusAsync(booking.GatewayOrderId, settings.Environment);
                    if (live.Unavailable) continue; // state unknown — next sweep
                    if (live.IsPaid && live.Amount >= booking.AmountPaid)
                    {
                        await ConfirmPaidAsync(booking, await LoadExperienceAsync(booking));
                        continue;
                    }
                    // Cashfree expires the order itself at ExpiresAt; this only
                    // covers one still open. Refused = a payment is in flight.
                    if (live.IsActive && !await _gateway.TerminateOrderAsync(booking.GatewayOrderId, settings.Environment))
                    {
                        continue;
                    }
                }

                if (await _submissions.TryMarkExpiredAsync(booking.Id)) expired++;
            }
            return expired;
        }

        /// <summary>
        /// What a verified webhook means for its booking. The webhook body is
        /// never trusted for the payment itself — it only prompts asking the
        /// gateway, exactly like the confirmation page does.
        /// </summary>
        private async Task<(WebhookOutcome Outcome, string Note)> ReconcileFromWebhookAsync(GatewayWebhookEvent parsed)
        {
            if (string.IsNullOrEmpty(parsed.OrderId))
            {
                return (WebhookOutcome.Handled, "No order id — ignored.");
            }
            var booking = await _submissions.GetByGatewayOrderIdAsync(parsed.OrderId);
            if (booking is null)
            {
                return (WebhookOutcome.Handled, "Unknown order — ignored (e.g. a dashboard test webhook).");
            }
            if (booking.Status is SubmissionStatus.Paid or SubmissionStatus.Submitted)
            {
                return (WebhookOutcome.Handled, "Already confirmed.");
            }
            if (booking.Status is not (SubmissionStatus.PendingPayment or SubmissionStatus.Expired))
            {
                return (WebhookOutcome.Handled, $"Booking is {booking.Status} — ignored.");
            }

            var settings = await _paymentSettings.GetCurrentEntityAsync();
            var live = await _gateway.GetOrderStatusAsync(booking.GatewayOrderId, settings.Environment);
            if (live.Unavailable)
            {
                return (WebhookOutcome.RetryLater, "Couldn't reach the gateway to check the order — Cashfree will retry.");
            }
            if (!live.IsPaid)
            {
                // e.g. PAYMENT_FAILED: the order stays open, so the visitor can still pay it.
                return (WebhookOutcome.Handled, $"Order is {live.Status} — nothing to confirm.");
            }
            if (live.Amount < booking.AmountPaid)
            {
                return (WebhookOutcome.Handled,
                    $"Order PAID {live.Amount} but the booking is {booking.AmountPaid} — NOT confirmed, check it by hand.");
            }

            var late = booking.Status == SubmissionStatus.Expired;
            await ConfirmPaidAsync(booking, await LoadExperienceAsync(booking), parsed.PaymentId);
            return (WebhookOutcome.Handled, late
                ? "Confirmed — paid after its hold expired; check capacity / the Private date isn't double-booked."
                : "Confirmed.");
        }

        /// <summary>
        /// PendingPayment → Paid (capacity − Quantity). Only the call that wins
        /// the conditional update sends the emails, so a refresh or a racing
        /// webhook never sends them twice.
        /// </summary>
        private async Task ConfirmPaidAsync(FormSubmission booking, ExperienceTemplate? experience, string? gatewayPaymentId = null)
        {
            var paidAt = DateTime.UtcNow;
            var won = await _submissions.TryMarkPaidAsync(
                booking.Id, booking.ExperienceTemplateId, booking.Quantity, paidAt, Trim(gatewayPaymentId, 100));
            // Whether this call or a concurrent one won, the booking is paid now.
            booking.Status = SubmissionStatus.Paid;
            booking.PaidAt ??= paidAt;
            if (!won) return;

            var template = _options.BookingUrlTemplate;
            var email = new BookingConfirmationEmail
            {
                BookingRef = booking.BookingRef!,
                ExperienceTitle = experience?.Title ?? "your Archaeo Trails experience",
                ExperienceDate = booking.BookedSlot ?? experience?.StartDate,
                RegistrationType = booking.RegistrationType,
                Quantity = booking.Quantity,
                Amount = booking.AmountPaid,
                Currency = booking.Currency,
                SubmitterName = booking.SubmitterName,
                SubmitterEmail = booking.SubmitterEmail,
                SubmitterPhone = booking.SubmitterPhone,
                PaidAt = booking.PaidAt.Value,
                BookingUrl = string.IsNullOrWhiteSpace(template) || template == "REPLACE_ME"
                    ? null
                    : template.Replace("{order_id}", booking.BookingRef),
                DataJson = booking.DataJson
            };
            // Fire-and-forget like ContactController — the visitor shouldn't wait on SMTP.
            _ = Task.Run(() => _email.SendBookingConfirmationEmailAsync(email));
            _ = Task.Run(() => _email.SendBookingOwnerEmailAsync(email));
        }

        private static BookingResult<CreateBookingResponse> Fail(BookingError error, string message) =>
            BookingResult<CreateBookingResponse>.Fail(error, message);

        private static CreateBookingResponse AlreadyPaidResponse(FormSubmission booking) => new()
        {
            BookingRef = booking.BookingRef!,
            AlreadyPaid = true,
            Amount = booking.AmountPaid,
            Quantity = booking.Quantity,
            Currency = booking.Currency
        };

        // Timestamps are stored in UTC, but SQL Server hands them back with
        // Kind = Unspecified, which serializes without a "Z" — browsers then
        // read them as local time (5½ hours off in India). Mark them UTC.
        private static DateTime AsUtc(DateTime value) => DateTime.SpecifyKind(value, DateTimeKind.Utc);

        private static DateTime? AsUtc(DateTime? value) => value.HasValue ? AsUtc(value.Value) : null;

        private static string ModeOf(PaymentEnvironment environment) =>
            environment == PaymentEnvironment.Production ? "production" : "sandbox";

        private async Task<FormSubmission?> FindByRefAsync(string? bookingRef)
        {
            var normalized = (bookingRef ?? string.Empty).Trim().ToUpperInvariant();
            return string.IsNullOrEmpty(normalized) ? null : await _submissions.GetByBookingRefAsync(normalized);
        }

        private async Task<ExperienceTemplate?> LoadExperienceAsync(FormSubmission booking) =>
            booking.ExperienceTemplateId.HasValue
                ? await _experiences.GetByIdAsync(booking.ExperienceTemplateId.Value)
                : null;

        private async Task<string> NewBookingRefAsync()
        {
            // ~887M combinations — a clash is rare; the unique index is the backstop.
            for (var attempt = 0; attempt < 5; attempt++)
            {
                var chars = new char[RefLength];
                for (var i = 0; i < RefLength; i++)
                {
                    chars[i] = RefAlphabet[RandomNumberGenerator.GetInt32(RefAlphabet.Length)];
                }
                var candidate = "AT-" + new string(chars);
                if (await _submissions.GetByBookingRefAsync(candidate) is null) return candidate;
            }
            throw new InvalidOperationException("Couldn't generate a unique booking reference.");
        }

        private static bool TryParseRequestedType(string? raw, out RegistrationType type)
        {
            // "Individual" is the pre-rename spelling of Group.
            var value = string.Equals(raw, "Individual", StringComparison.OrdinalIgnoreCase) ? "Group" : raw;
            return Enum.TryParse(value, true, out type) && type != RegistrationType.Both;
        }

        private static bool IsOffered(RegistrationType offered, RegistrationType requested) =>
            offered == RegistrationType.Both || offered == requested;

        private static bool TryParseSlot(string? raw, out DateTime slot) =>
            DateTime.TryParse(raw, CultureInfo.InvariantCulture,
                DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out slot);

        private static string? Trim(string? value, int max)
        {
            if (string.IsNullOrWhiteSpace(value)) return null;
            var t = value.Trim();
            return t.Length <= max ? t : t[..max];
        }
    }
}
