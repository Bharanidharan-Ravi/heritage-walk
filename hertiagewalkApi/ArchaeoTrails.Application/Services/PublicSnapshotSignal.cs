using System.Threading;
using System.Threading.Tasks;

namespace ArchaeoTrails.Application.Services
{
    /// <summary>
    /// "Public data changed" flag for the public-site snapshot in Sanity (see
    /// PublicSnapshotWorker). Repositories call MarkDirty() right after a write
    /// that changes what visitors see — an experience saved, a form edited,
    /// a seat or private date taken — and the worker rebuilds the snapshot a
    /// few seconds later, while Azure SQL is still awake from that write.
    ///
    /// Many writes in a burst collapse into one rebuild: the semaphore never
    /// counts above 1.
    /// </summary>
    public class PublicSnapshotSignal
    {
        private readonly SemaphoreSlim _dirty = new(0, 1);

        public void MarkDirty()
        {
            try { _dirty.Release(); }
            catch (SemaphoreFullException) { /* already pending */ }
        }

        public Task WaitAsync(CancellationToken cancellationToken) => _dirty.WaitAsync(cancellationToken);

        /// <summary>
        /// Clears a pending signal without waiting. The worker calls it just
        /// before reading the database, so writes made during the debounce are
        /// covered by this rebuild instead of causing a second one (each
        /// rebuild is a database wake). Writes after this point still signal.
        /// </summary>
        public void Consume() => _dirty.Wait(0);
    }
}
