using System;
using System.Threading;
using System.Threading.Tasks;
using ArchaeoTrails.Application.Interfaces;
using ArchaeoTrails.Application.Services;

namespace ArchaeoTrails.Api.Background
{
    /// <summary>
    /// Every Bookings:ExpirySweepMinutes, settles pending bookings whose hold ran
    /// out: confirmed if Cashfree says they were paid after all (a missed
    /// webhook), otherwise marked Expired. Without this, an abandoned checkout
    /// stays PendingPayment in the database forever.
    ///
    /// Sweeps once at startup (holds left from before a restart), then only
    /// while BookingHoldTracker says a recent hold can be stale — otherwise it
    /// leaves the database alone so Azure SQL serverless can auto-pause.
    /// </summary>
    public class BookingExpiryWorker : BackgroundService
    {
        private readonly IServiceScopeFactory _scopes;
        private readonly BookingOptions _options;
        private readonly BookingHoldTracker _holdTracker;
        private readonly ILogger<BookingExpiryWorker> _logger;

        public BookingExpiryWorker(IServiceScopeFactory scopes, BookingOptions options, BookingHoldTracker holdTracker, ILogger<BookingExpiryWorker> logger)
        {
            _scopes = scopes;
            _options = options;
            _holdTracker = holdTracker;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var interval = TimeSpan.FromMinutes(Math.Max(1, _options.ExpirySweepMinutes));
            // A few sweeps past the last stale point, for gateway hiccups.
            var slack = interval * 3;
            using var timer = new PeriodicTimer(interval);
            var startup = true;
            do
            {
                if (!startup && !_holdTracker.IsSweepDue(DateTime.UtcNow, slack)) continue;
                startup = false;
                try
                {
                    // BookingService and its DbContext are scoped — a fresh scope per sweep.
                    using var scope = _scopes.CreateScope();
                    var bookings = scope.ServiceProvider.GetRequiredService<IBookingService>();
                    var expired = await bookings.ExpireStaleHoldsAsync();
                    if (expired > 0)
                    {
                        _logger.LogInformation("Expired {Count} unpaid booking hold(s)", expired);
                    }
                }
                catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
                {
                    // Never let one bad sweep (DB blip, Cashfree down) stop the worker.
                    _logger.LogError(ex, "Booking expiry sweep failed");
                }
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
    }
}
