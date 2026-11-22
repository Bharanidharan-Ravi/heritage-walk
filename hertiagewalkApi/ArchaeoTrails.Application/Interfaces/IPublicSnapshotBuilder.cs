using System.Threading.Tasks;
using ArchaeoTrails.Application.Features.Experiences;

namespace ArchaeoTrails.Application.Interfaces
{
    /// <summary>Reads Azure SQL and assembles the public-site snapshot for one site (live or /test).</summary>
    public interface IPublicSnapshotBuilder
    {
        Task<PublicSiteSnapshot> BuildAsync(bool isTest);
    }
}
