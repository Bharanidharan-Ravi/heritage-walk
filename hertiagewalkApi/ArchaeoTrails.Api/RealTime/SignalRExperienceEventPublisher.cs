using System;
using System.Threading.Tasks;
using ArchaeoTrails.Api.Hubs;
using ArchaeoTrails.Application.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace ArchaeoTrails.Api.RealTime
{
    /// <summary>
    /// Implements IExperienceEventPublisher via SignalR. Lives in the Api
    /// project (not Infrastructure) because IHubContext&lt;ExperienceHub&gt;
    /// needs the Hub type, and the Hub belongs in Api (controllers/hubs are
    /// presentation-layer) — Infrastructure can't reference Api without a
    /// circular project reference, so this is the one place the concrete
    /// implementation can live while Application only knows the interface,
    /// same shape as IEmailService/ISanityContentService.
    /// </summary>
    public class SignalRExperienceEventPublisher : IExperienceEventPublisher
    {
        private const string AdminGroup = "admin:experiences";
        private static string EmployeeGroup(Guid userId) => $"employee:{userId}";

        private readonly IHubContext<ExperienceHub> _hub;

        public SignalRExperienceEventPublisher(IHubContext<ExperienceHub> hub)
        {
            _hub = hub;
        }

        public Task ExperienceCreatedAsync(Guid id) =>
            _hub.Clients.Group(AdminGroup).SendAsync("ExperienceCreated", new { id });

        public Task ExperienceUpdatedAsync(Guid id) =>
            _hub.Clients.Group(AdminGroup).SendAsync("ExperienceUpdated", new { id });

        public Task ApprovalRequestedAsync(Guid id, Guid ownerId) =>
            _hub.Clients.Group(AdminGroup).SendAsync("ApprovalRequested", new { id, ownerId });

        public Task ExperienceStatusChangedAsync(Guid id, Guid ownerId, string status, DateTime updatedAt) =>
            _hub.Clients.Groups(AdminGroup, EmployeeGroup(ownerId))
                .SendAsync("ExperienceStatusChanged", new { id, status, updatedAt });

        public Task ExperiencePublishedAsync(Guid id, Guid ownerId, DateTime updatedAt) =>
            _hub.Clients.Groups(AdminGroup, EmployeeGroup(ownerId))
                .SendAsync("ExperiencePublished", new { id, status = "Published", updatedAt });

        public Task BookingUpdatedAsync(Guid experienceId, int booked, int? remaining) =>
            // No public "experience:{id}" group yet — see the interface's doc
            // comment. Admins watching the Experiences list are the only
            // current subscribers.
            _hub.Clients.Group(AdminGroup).SendAsync("BookingUpdated", new { experienceId, booked, remaining });
    }
}
