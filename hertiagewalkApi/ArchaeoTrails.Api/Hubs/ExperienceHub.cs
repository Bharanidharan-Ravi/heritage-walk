using System.Security.Claims;
using System.Threading.Tasks;
using ArchaeoTrails.Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace ArchaeoTrails.Api.Hubs
{
    /// <summary>
    /// Real-time push channel for the Experiences module (approval workflow +
    /// booking capacity). Connection/group management only — no SQL, no
    /// business logic. Server -> client push only; there are no
    /// client-invokable methods yet.
    ///
    /// Group membership:
    ///  - every connected Admin/Employee joins "employee:{userId}" (their own
    ///    inbox — used when a status change is specifically about something
    ///    they own).
    ///  - Admins additionally join "admin:experiences" (sees everyone's
    ///    creates/updates/approval requests/status changes).
    ///
    /// See IExperienceEventPublisher for what gets sent to these groups and
    /// SignalRExperienceEventPublisher for the actual sends.
    /// </summary>
    [Authorize(Roles = Roles.StaffPolicy)]
    public class ExperienceHub : Hub
    {
        public override async Task OnConnectedAsync()
        {
            var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier) ?? Context.User?.FindFirstValue("sub");
            if (!string.IsNullOrEmpty(userId))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"employee:{userId}");
            }

            if (Context.User?.IsInRole(Roles.Admin) == true)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, "admin:experiences");
            }

            await base.OnConnectedAsync();
        }
    }
}
