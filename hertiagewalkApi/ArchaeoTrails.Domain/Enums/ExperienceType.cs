namespace ArchaeoTrails.Domain.Enums
{
    /// <summary>
    /// The kind of experience the Experience Builder produces. One builder
    /// engine, many types — adding a new type (Workshop, Field Trip, Heritage
    /// Tour, Training, Webinar, ...) is one new member here plus a new block
    /// catalogue on the frontend (see Config/experienceBuilder.config.jsx),
    /// never a redesign of the module.
    /// </summary>
    public enum ExperienceType
    {
        Walk = 0,
        Seminar = 1,
        Course = 2
    }
}
