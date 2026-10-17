using System;
using ArchaeoTrails.Application.Services;

namespace ArchaeoTrails.Application.Tests
{
    public class BookingHoldTrackerTests
    {
        private static readonly DateTime T0 = new(2026, 10, 11, 10, 0, 0, DateTimeKind.Utc);
        private static readonly TimeSpan Slack = TimeSpan.FromMinutes(6);

        [Fact]
        public void NoHolds_NeverDue()
        {
            var tracker = new BookingHoldTracker();

            Assert.False(tracker.IsSweepDue(T0, Slack));
        }

        [Fact]
        public void Hold_DueOnlyFromStalePointUntilSlackRunsOut()
        {
            var tracker = new BookingHoldTracker();
            tracker.HoldCreated(T0.AddMinutes(20));

            Assert.False(tracker.IsSweepDue(T0.AddMinutes(10), Slack));
            Assert.True(tracker.IsSweepDue(T0.AddMinutes(20), Slack));
            Assert.True(tracker.IsSweepDue(T0.AddMinutes(26), Slack));
            Assert.False(tracker.IsSweepDue(T0.AddMinutes(27), Slack));
        }

        [Fact]
        public void WindowOver_StaysQuietUntilNextHold()
        {
            var tracker = new BookingHoldTracker();
            tracker.HoldCreated(T0);
            Assert.False(tracker.IsSweepDue(T0.AddHours(1), Slack));

            Assert.False(tracker.IsSweepDue(T0.AddHours(2), Slack));

            tracker.HoldCreated(T0.AddHours(3));
            Assert.True(tracker.IsSweepDue(T0.AddHours(3), Slack));
        }

        [Fact]
        public void SeveralHolds_WindowSpansFirstToLast()
        {
            var tracker = new BookingHoldTracker();
            tracker.HoldCreated(T0.AddMinutes(40));
            tracker.HoldCreated(T0.AddMinutes(20));

            Assert.True(tracker.IsSweepDue(T0.AddMinutes(30), Slack));
            Assert.True(tracker.IsSweepDue(T0.AddMinutes(46), Slack));
            Assert.False(tracker.IsSweepDue(T0.AddMinutes(47), Slack));
        }
    }
}
