using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using ArchaeoTrails.Application.Interfaces;
using ArchaeoTrails.Application.Services;

namespace ArchaeoTrails.Api.Background
{
    /// <summary>
    /// Keeps the public-site snapshot in Sanity up to date so visitors browsing
    /// walks/seminars and opening registration forms read Sanity's free CDN
    /// instead of the API — Azure SQL serverless stays paused until someone
    /// actually books (see UI/src/publicSnapshot.js).
    ///
    /// Waits for PublicSnapshotSignal (raised by the repositories after a write
    /// that changes public data), waits a few seconds so a burst of writes
    /// becomes one rebuild, then rebuilds BOTH sites (live and /test — cheap,
    /// and saves tracking which one changed) while SQL is still awake from
    /// the write that triggered it.
    ///
    /// Never touches the database at startup — that would wake Azure SQL on
    /// every App Service restart. After deploying, an Admin can force a first
    /// build via POST /api/experiences/public-snapshot/rebuild; until a
    /// snapshot exists the site simply falls back to the API.
    /// </summary>
    public class PublicSnapshotWorker : BackgroundService
    {
        private static readonly TimeSpan Debounce = TimeSpan.FromSeconds(3);
        // Same casing the controllers return, so the site reads one shape.
        private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

        private readonly IServiceScopeFactory _scopes;
        private readonly PublicSnapshotSignal _signal;
        private readonly ILogger<PublicSnapshotWorker> _logger;
        private readonly bool _writeEnabled;
        private readonly TimeSpan _debounce;

        public PublicSnapshotWorker(IServiceScopeFactory scopes, PublicSnapshotSignal signal,
            ILogger<PublicSnapshotWorker> logger, IConfiguration configuration, IHostEnvironment environment)
        {
            _scopes = scopes;
            _signal = signal;
            _logger = logger;
            // Off by default in Development: a local run reads the local
            // database, and writing that to Sanity would replace what the LIVE
            // site shows. Set PublicSnapshot:WriteToSanity=true locally only
            // when that is what you want.
            _writeEnabled = configuration.GetValue("PublicSnapshot:WriteToSanity", !environment.IsDevelopment());
            _debounce = TimeSpan.FromMilliseconds(configuration.GetValue("PublicSnapshot:DebounceMs", (int)Debounce.TotalMilliseconds));
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await _signal.WaitAsync(stoppingToken);
                    await Task.Delay(_debounce, stoppingToken);
                    // Writes during the delay are included in this rebuild.
                    _signal.Consume();

                    if (!_writeEnabled)
                    {
                        _logger.LogInformation("Public snapshot rebuild skipped: PublicSnapshot:WriteToSanity is false");
                        continue;
                    }

                    using var scope = _scopes.CreateScope();
                    var builder = scope.ServiceProvider.GetRequiredService<IPublicSnapshotBuilder>();
                    var sanity = scope.ServiceProvider.GetRequiredService<ISanityContentService>();

                    foreach (var isTest in new[] { false, true })
                    {
                        var snapshot = await builder.BuildAsync(isTest);
                        var result = await sanity.UpsertPublicSnapshotAsync(isTest, JsonSerializer.Serialize(snapshot, JsonOptions));
                        if (result.Success)
                        {
                            _logger.LogInformation("Public snapshot ({Site}) written to Sanity: {Count} experience(s)",
                                isTest ? "test" : "live", snapshot.Experiences.Count);
                        }
                        else
                        {
                            // The site keeps working off the API / the last good snapshot.
                            _logger.LogWarning("Public snapshot ({Site}) not written: {Error}", isTest ? "test" : "live", result.Error);
                        }
                    }
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    // Never let one bad rebuild (DB blip, Sanity down) stop the worker.
                    _logger.LogError(ex, "Public snapshot rebuild failed");
                }
            }
        }
    }
}
