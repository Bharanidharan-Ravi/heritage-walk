using System;
using System.Collections.Generic;
using ArchaeoTrails.Application.Features.Forms;

namespace ArchaeoTrails.Application.Features.Experiences
{
    /// <summary>
    /// Everything the public site needs to show walks/seminars and their
    /// registration forms without calling the API, written to Sanity (see
    /// PublicSnapshotWorker) and read from Sanity's free CDN by the site.
    /// Only Azure SQL is authoritative: BookingService re-checks seats, dates
    /// and the booking deadline when someone actually pays, so a snapshot a
    /// few seconds stale can never cause an overbooking.
    ///
    /// Time-dependent rules are NOT baked in, because the snapshot is only
    /// rebuilt when data changes: the site itself hides experiences whose
    /// EndDate has passed and closes booking after BookingEndDate (India time).
    /// So each experience's BookingEnabled here covers only the
    /// date-independent part (form linked, seats left, a private date left).
    /// </summary>
    public class PublicSiteSnapshot
    {
        public int SchemaVersion { get; set; } = 1;
        public DateTime GeneratedAt { get; set; }
        public bool IsTest { get; set; }

        /// <summary>Published experiences not yet ended, ordered by StartDate.</summary>
        public List<PublicExperienceDetailDto> Experiences { get; set; } = new();

        /// <summary>Registration forms of those experiences, keyed by slug — same shape as GET /api/forms/{slug}.</summary>
        public Dictionary<string, FormDto> Forms { get; set; } = new();
    }
}
