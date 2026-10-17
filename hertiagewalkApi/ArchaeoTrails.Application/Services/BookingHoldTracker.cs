using System;

namespace ArchaeoTrails.Application.Services
{
    /// <summary>
    /// Tells the expiry worker when a sweep can find anything, so it doesn't
    /// query the database every few minutes around the clock. Azure SQL
    /// serverless only auto-pauses after an idle hour, and every awake second
    /// is billed against the free vCore allowance — a constant sweep would keep
    /// it awake 24/7 and use up the month's allowance in a couple of days.
    ///
    /// BookingService reports each new hold; the worker sweeps only from the
    /// earliest point one of them can go stale until shortly after the last
    /// one has. Holds left from before an app restart are caught by the
    /// worker's one startup sweep. In-memory only — fine for a single instance.
    /// </summary>
    public class BookingHoldTracker
    {
        private readonly object _lock = new();
        private DateTime? _firstDue;
        private DateTime? _lastDue;

        /// <summary>A pending hold was created that becomes stale at <paramref name="staleAtUtc"/>.</summary>
        public void HoldCreated(DateTime staleAtUtc)
        {
            lock (_lock)
            {
                if (_firstDue is null || staleAtUtc < _firstDue) _firstDue = staleAtUtc;
                if (_lastDue is null || staleAtUtc > _lastDue) _lastDue = staleAtUtc;
            }
        }

        /// <summary>
        /// Whether a sweep is worth running now. <paramref name="slack"/> keeps
        /// sweeping a little past the last stale point, so a hold the gateway
        /// couldn't settle on the first try gets another go.
        /// </summary>
        public bool IsSweepDue(DateTime nowUtc, TimeSpan slack)
        {
            lock (_lock)
            {
                if (_firstDue is null || _lastDue is null || nowUtc < _firstDue) return false;
                if (nowUtc <= _lastDue + slack) return true;

                // Window over — go quiet until the next hold.
                _firstDue = null;
                _lastDue = null;
                return false;
            }
        }
    }
}
