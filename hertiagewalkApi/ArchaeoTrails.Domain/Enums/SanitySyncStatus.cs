namespace ArchaeoTrails.Domain.Enums
{
    /// <summary>
    /// Outcome of the last attempt to push an ExperienceTemplate's editorial
    /// content to Sanity. A failure here must never lose the SQL row — Azure
    /// SQL stays the authoritative workflow record regardless of this value;
    /// this only tells an Admin whether a retry (POST /api/experiences/{id}/
    /// sync-retry) is needed.
    /// </summary>
    public enum SanitySyncStatus
    {
        /// <summary>Never attempted — e.g. still a Draft.</summary>
        NotSynced = 0,
        Synced = 1,
        Failed = 2
    }
}
