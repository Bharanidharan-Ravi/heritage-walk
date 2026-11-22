using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using ArchaeoTrails.Api.Background;
using ArchaeoTrails.Application.Features.Experiences;
using ArchaeoTrails.Application.Interfaces;
using ArchaeoTrails.Application.Services;
using ArchaeoTrails.Domain.Entities;
using ArchaeoTrails.Infrastructure.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;

namespace ArchaeoTrails.Application.Tests
{
    public class PublicSnapshotSyncTests
    {
        // ---- PublicSnapshotSignal ---------------------------------------------------

        [Fact]
        public async Task Signal_ManyWrites_CollapseIntoOneRebuild()
        {
            var signal = new PublicSnapshotSignal();
            for (var i = 0; i < 100; i++) signal.MarkDirty();

            await signal.WaitAsync(CancellationToken.None); // the one pending rebuild
            using var cts = new CancellationTokenSource(100);
            await Assert.ThrowsAnyAsync<OperationCanceledException>(() => signal.WaitAsync(cts.Token));
        }

        // ---- PublicSnapshotWorker ------------------------------------------------------

        private sealed class FakeBuilder : IPublicSnapshotBuilder
        {
            public int Builds;
            public bool Throw;
            public Task<PublicSiteSnapshot> BuildAsync(bool isTest)
            {
                Interlocked.Increment(ref Builds);
                if (Throw) throw new InvalidOperationException("db down");
                return Task.FromResult(new PublicSiteSnapshot { IsTest = isTest });
            }
        }

        private sealed class FakeSanity : ISanityContentService
        {
            public ConcurrentQueue<(bool IsTest, string Json)> Writes { get; } = new();
            public Task<SanitySyncResult> UpsertPublicSnapshotAsync(bool isTest, string snapshotJson)
            {
                Writes.Enqueue((isTest, snapshotJson));
                return Task.FromResult(SanitySyncResult.Ok("x"));
            }
            public Task<SanitySyncResult> UpsertDraftAsync(ExperienceTemplate experience) => throw new NotSupportedException();
            public Task<SanitySyncResult> PublishAsync(ExperienceTemplate experience) => throw new NotSupportedException();
            public Task<SanityAssetUploadResult> UploadImageAssetAsync(Stream fileStream, string fileName, string contentType) => throw new NotSupportedException();
            public Task<SanityAssetDeleteResult> DeleteImageAssetAsync(string assetUrl) => throw new NotSupportedException();
        }

        private static (PublicSnapshotWorker Worker, PublicSnapshotSignal Signal, FakeBuilder Builder, FakeSanity Sanity)
            Worker(bool writeEnabled = true)
        {
            var builder = new FakeBuilder();
            var sanity = new FakeSanity();
            var services = new ServiceCollection()
                .AddSingleton<IPublicSnapshotBuilder>(builder)
                .AddSingleton<ISanityContentService>(sanity)
                .BuildServiceProvider();
            var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["PublicSnapshot:WriteToSanity"] = writeEnabled.ToString(),
                ["PublicSnapshot:DebounceMs"] = "150"
            }).Build();
            var signal = new PublicSnapshotSignal();
            var worker = new PublicSnapshotWorker(services.GetRequiredService<IServiceScopeFactory>(), signal,
                NullLogger<PublicSnapshotWorker>.Instance, config, new FakeEnv("Production"));
            return (worker, signal, builder, sanity);
        }

        private sealed class FakeEnv : IHostEnvironment
        {
            public FakeEnv(string name) => EnvironmentName = name;
            public string EnvironmentName { get; set; }
            public string ApplicationName { get; set; } = "test";
            public string ContentRootPath { get; set; } = "";
            public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } = null!;
        }

        [Theory]
        [InlineData("Development", null, false)] // a laptop run never overwrites the live snapshot
        [InlineData("Development", "true", true)]
        [InlineData("Production", null, true)]
        [InlineData("Production", "false", false)]
        public async Task Worker_WriteDefault_DependsOnEnvironment(string env, string? setting, bool expectWrite)
        {
            var builder = new FakeBuilder();
            var sanity = new FakeSanity();
            var services = new ServiceCollection()
                .AddSingleton<IPublicSnapshotBuilder>(builder)
                .AddSingleton<ISanityContentService>(sanity)
                .BuildServiceProvider();
            var values = new Dictionary<string, string?> { ["PublicSnapshot:DebounceMs"] = "50" };
            if (setting is not null) values["PublicSnapshot:WriteToSanity"] = setting;
            var signal = new PublicSnapshotSignal();
            var worker = new PublicSnapshotWorker(services.GetRequiredService<IServiceScopeFactory>(), signal,
                NullLogger<PublicSnapshotWorker>.Instance,
                new ConfigurationBuilder().AddInMemoryCollection(values).Build(), new FakeEnv(env));

            await worker.StartAsync(CancellationToken.None);
            signal.MarkDirty();
            await WaitUntil(() => sanity.Writes.Count >= 2, expectWrite ? 3000 : 400);
            await worker.StopAsync(CancellationToken.None);

            Assert.Equal(expectWrite ? 2 : 0, sanity.Writes.Count);
        }

        private static async Task WaitUntil(Func<bool> condition, int ms = 3000)
        {
            for (var waited = 0; !condition() && waited < ms; waited += 20) await Task.Delay(20);
        }

        [Fact]
        public async Task Worker_NothingChanged_NeverTouchesTheDatabase()
        {
            var (worker, _, builder, sanity) = Worker();
            await worker.StartAsync(CancellationToken.None);
            await Task.Delay(400);
            await worker.StopAsync(CancellationToken.None);
            Assert.Equal(0, builder.Builds); // no startup build = no Azure SQL wake on restart
            Assert.Empty(sanity.Writes);
        }

        [Fact]
        public async Task Worker_ABurstOfWrites_RebuildsBothSitesOnce()
        {
            var (worker, signal, builder, sanity) = Worker();
            await worker.StartAsync(CancellationToken.None);

            for (var i = 0; i < 10; i++) { signal.MarkDirty(); await Task.Delay(5); }
            await WaitUntil(() => sanity.Writes.Count >= 2);
            await Task.Delay(400); // would a second rebuild follow?
            await worker.StopAsync(CancellationToken.None);

            Assert.Equal(2, builder.Builds);
            var writes = sanity.Writes.ToArray();
            Assert.Equal(2, writes.Length);
            Assert.Contains(writes, w => !w.IsTest);
            Assert.Contains(writes, w => w.IsTest);
            // camelCase, like the API's own JSON.
            using var doc = JsonDocument.Parse(writes[0].Json);
            Assert.True(doc.RootElement.TryGetProperty("schemaVersion", out _));
            Assert.True(doc.RootElement.TryGetProperty("experiences", out _));
        }

        [Fact]
        public async Task Worker_KeepsGoingAfterAFailedRebuild()
        {
            var (worker, signal, builder, sanity) = Worker();
            builder.Throw = true;
            await worker.StartAsync(CancellationToken.None);

            signal.MarkDirty();
            await WaitUntil(() => builder.Builds >= 1);
            builder.Throw = false;
            signal.MarkDirty();
            await WaitUntil(() => sanity.Writes.Count >= 2);
            await worker.StopAsync(CancellationToken.None);

            Assert.Equal(2, sanity.Writes.Count);
        }

        [Fact]
        public async Task Worker_WritesDisabled_DoesNotBuildOrWrite()
        {
            var (worker, signal, builder, sanity) = Worker(writeEnabled: false);
            await worker.StartAsync(CancellationToken.None);
            signal.MarkDirty();
            await Task.Delay(500);
            await worker.StopAsync(CancellationToken.None);
            Assert.Equal(0, builder.Builds);
            Assert.Empty(sanity.Writes);
        }

        // ---- SanityContentService.UpsertPublicSnapshotAsync -----------------------------

        private sealed class CapturingHandler : HttpMessageHandler
        {
            public HttpStatusCode Status = HttpStatusCode.OK;
            public List<(HttpRequestMessage Request, string Body)> Calls { get; } = new();
            protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
            {
                Calls.Add((request, request.Content is null ? "" : await request.Content.ReadAsStringAsync(ct)));
                return new HttpResponseMessage(Status) { Content = new StringContent("{\"error\":\"nope\"}") };
            }
        }

        private static (SanityContentService Service, CapturingHandler Handler) Sanity(string? token = "sk-test-token")
        {
            var handler = new CapturingHandler();
            var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Sanity:ProjectId"] = "nh8jhz7r",
                ["Sanity:Dataset"] = "production",
                ["Sanity:WriteToken"] = token
            }).Build();
            return (new SanityContentService(config, new HttpClient(handler)), handler);
        }

        [Theory]
        [InlineData(false, "publicSnapshot-live", "live")]
        [InlineData(true, "publicSnapshot-test", "test")]
        public async Task Sanity_WritesOnePublicDocumentPerSite(bool isTest, string expectedId, string env)
        {
            var (service, handler) = Sanity();
            var result = await service.UpsertPublicSnapshotAsync(isTest, "{\"schemaVersion\":1}");

            Assert.True(result.Success, result.Error);
            var (request, body) = Assert.Single(handler.Calls);
            Assert.Equal(HttpMethod.Post, request.Method);
            Assert.Equal("https://nh8jhz7r.api.sanity.io/v2021-06-07/data/mutate/production", request.RequestUri!.ToString());
            Assert.Equal("Bearer", request.Headers.Authorization!.Scheme);
            Assert.Equal("sk-test-token", request.Headers.Authorization.Parameter);

            using var doc = JsonDocument.Parse(body);
            var d = doc.RootElement.GetProperty("mutations")[0].GetProperty("createOrReplace");
            var id = d.GetProperty("_id").GetString()!;
            Assert.Equal(expectedId, id);
            Assert.DoesNotContain('.', id); // dotted ids are private in Sanity — the site couldn't read it
            Assert.Equal(env, d.GetProperty("env").GetString());
            Assert.Equal("{\"schemaVersion\":1}", d.GetProperty("data").GetString());
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("REPLACE_ME")]
        public async Task Sanity_NoToken_FailsWithoutCallingSanity(string? token)
        {
            var (service, handler) = Sanity(token);
            var result = await service.UpsertPublicSnapshotAsync(false, "{}");
            Assert.False(result.Success);
            Assert.Empty(handler.Calls);
        }

        [Fact]
        public async Task Sanity_Rejected_ReturnsTheError()
        {
            var (service, handler) = Sanity();
            handler.Status = HttpStatusCode.Unauthorized;
            var result = await service.UpsertPublicSnapshotAsync(false, "{}");
            Assert.False(result.Success);
            Assert.Contains("401", result.Error);
        }
    }
}
