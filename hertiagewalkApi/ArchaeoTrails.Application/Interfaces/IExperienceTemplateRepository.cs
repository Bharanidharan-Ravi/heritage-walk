using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ArchaeoTrails.Domain.Entities;
using ArchaeoTrails.Domain.Enums;

namespace ArchaeoTrails.Application.Interfaces
{
    /// <summary>Which of the 3 management-page tabs a query is for.</summary>
    public enum ExperienceTab
    {
        Pending,
        Active,
        Closed
    }

    public enum ExperienceSort
    {
        UpdatedAtDesc,
        TitleAsc,
        TitleDesc,
        PriceAsc,
        PriceDesc,
        BookingEndDateAsc,
        BookingEndDateDesc,
        StartDateAsc,
        StartDateDesc
    }

    /// <summary>Filter/paging options for the Experiences management list — see spec §25/§26.</summary>
    public class ExperienceListQuery
    {
        public ExperienceTab Tab { get; set; } = ExperienceTab.Pending;
        public ExperienceType? Type { get; set; }
        public string? Search { get; set; }
        public ExperienceSort Sort { get; set; } = ExperienceSort.UpdatedAtDesc;
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;

        /// <summary>Set when the caller is an Employee and Tab == Pending — restricts results to their own rows.</summary>
        public Guid? OwnerScopeUserId { get; set; }
    }

    public class ExperienceListPage
    {
        public IReadOnlyList<ExperienceTemplate> Items { get; set; } = Array.Empty<ExperienceTemplate>();
        public int TotalCount { get; set; }

        /// <summary>Booking-form ids referenced by Items, each mapped to its confirmed-submission count.</summary>
        public IReadOnlyDictionary<Guid, int> BookingCountsByFormTemplateId { get; set; } =
            new Dictionary<Guid, int>();

        /// <summary>CreatedByUserId -> display name, for Items only.</summary>
        public IReadOnlyDictionary<Guid, string> CreatedByNames { get; set; } =
            new Dictionary<Guid, string>();
    }

    public interface IExperienceTemplateRepository
    {
        Task<ExperienceTemplate?> GetByIdAsync(Guid id);

        Task<ExperienceTemplate?> GetByLinkedFormTemplateIdAsync(Guid formTemplateId);

        Task<ExperienceTemplate> CreateAsync(ExperienceTemplate experience);

        Task UpdateAsync(ExperienceTemplate experience);

        /// <summary>
        /// Server-side paginated/filtered/sorted list for the management page.
        /// Never loads the full table — Where/OrderBy/Skip/Take happen in one
        /// EF query, and the booking-count/created-by lookups below are batched
        /// for the returned page only (no N+1 — see spec §26).
        /// </summary>
        Task<ExperienceListPage> QueryAsync(ExperienceListQuery query);
    }
}
