using System;
using System.Collections.Generic;

namespace ArchaeoTrails.Application.Services
{
    /// <summary>
    /// In-memory cache for the anonymous GET /api/experiences/public list. The
    /// home page's Walks section calls it on every visit. Without this cache,
    /// each visitor would wake Azure SQL serverless, and every waking keeps it
    /// billed against the free vCore allowance for the whole auto-pause delay.
    ///
    /// Kept correct by EfExperienceTemplateRepository calling Invalidate() on
    /// every create/update, so a publish/close/edit shows up immediately. Each
    /// entry also expires at the next UTC midnight, because "Active" means
    /// EndDate &gt;= today. The list carries no capacity or booking counts, so
    /// bookings don't need to invalidate it. Rows changed outside the API
    /// (e.g. SQL run in the portal) show up after midnight or an app restart.
    /// In-memory only — fine for a single instance, like BookingHoldTracker.
    /// </summary>
    public class PublicExperienceListCache
    {
        // page/pageSize come from the query string, so the key space is
        // caller-controlled — clear everything rather than grow without bound.
        private const int MaxEntries = 64;

        private readonly object _lock = new();
        private readonly Dictionary<string, (object Value, DateTime ExpiresAtUtc)> _entries = new();
        private long _version;

        /// <summary>
        /// Read before querying the database, and pass to <see cref="Set"/> — a
        /// write that lands while the query runs then stops the stale result
        /// from being cached.
        /// </summary>
        public long Version
        {
            get { lock (_lock) return _version; }
        }

        public bool TryGet<T>(string key, DateTime nowUtc, out T? value) where T : class
        {
            lock (_lock)
            {
                if (_entries.TryGetValue(key, out var entry) && entry.ExpiresAtUtc > nowUtc && entry.Value is T typed)
                {
                    value = typed;
                    return true;
                }
            }
            value = null;
            return false;
        }

        public void Set(string key, object value, long versionReadBeforeQuery, DateTime nowUtc)
        {
            lock (_lock)
            {
                if (versionReadBeforeQuery != _version) return;
                if (_entries.Count >= MaxEntries && !_entries.ContainsKey(key)) _entries.Clear();
                _entries[key] = (value, nowUtc.Date.AddDays(1));
            }
        }

        /// <summary>Any experience was created or changed — drop every cached list.</summary>
        public void Invalidate()
        {
            lock (_lock)
            {
                _version++;
                _entries.Clear();
            }
        }
    }
}
