using System;
using ArchaeoTrails.Application.Services;
using Xunit;

namespace ArchaeoTrails.Application.Tests
{
    public class BookingRulesTests
    {
        // Booking end date as the admin UI saves it: date-only, midnight.
        private static readonly DateTime EndsNov20 = new(2026, 11, 20);

        [Fact]
        public void NoBookingEndDate_IsOpen() =>
            Assert.True(BookingRules.IsBookingOpen(null, DateTime.UtcNow));

        [Theory]
        // 19 Nov 10:00 IST
        [InlineData("2026-11-19T04:30:00Z", true)]
        // 20 Nov 00:30 IST — the end date itself must still accept bookings
        [InlineData("2026-11-19T19:00:00Z", true)]
        // 20 Nov 23:59 IST
        [InlineData("2026-11-20T18:29:00Z", true)]
        // 21 Nov 00:00 IST — closed
        [InlineData("2026-11-20T18:30:00Z", false)]
        // 21 Nov 12:00 IST
        [InlineData("2026-11-21T06:30:00Z", false)]
        public void BookingEndDate_IsInclusive_InIndiaTime(string utcNow, bool expectedOpen)
        {
            var now = DateTime.Parse(utcNow, null, System.Globalization.DateTimeStyles.AdjustToUniversal);
            Assert.Equal(expectedOpen, BookingRules.IsBookingOpen(EndsNov20, now));
        }
    }
}
