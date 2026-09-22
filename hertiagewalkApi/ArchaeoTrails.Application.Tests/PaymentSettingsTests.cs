using System;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using ArchaeoTrails.Api.Controllers;
using ArchaeoTrails.Application.Features.Payments;
using ArchaeoTrails.Application.Interfaces;
using ArchaeoTrails.Application.Services;
using ArchaeoTrails.Domain.Constants;
using ArchaeoTrails.Domain.Entities;
using ArchaeoTrails.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ArchaeoTrails.Application.Tests
{
    public class PaymentSettingsTests
    {
        private sealed class FakeRepository : IPaymentSettingsRepository
        {
            public PaymentSettings? Current { get; set; } = new();
            public int Saves { get; private set; }

            public Task<PaymentSettings?> GetCurrentAsync() => Task.FromResult(Current);

            public Task<PaymentSettings> CreateAsync(PaymentSettings settings)
            {
                Current = settings;
                return Task.FromResult(settings);
            }

            public Task UpdateAsync(PaymentSettings settings)
            {
                Saves++;
                return Task.CompletedTask;
            }
        }

        private static UpdatePaymentSettingsRequest ValidRequest() => new()
        {
            Provider = PaymentProvider.Cashfree,
            Environment = PaymentEnvironment.Production,
            IsEnabled = true,
            PlatformFeePercent = 6m,
            GatewayFeePercent = 1.95m,
            GatewayGstPercent = 18m,
            PricingMode = PaymentPricingMode.Standard,
            Currency = "inr"
        };

        // Test 10 (part 1): only the Admin role may reach any payment-settings
        // endpoint — Employee/User (and anonymous callers) are rejected by the
        // authorization middleware because the controller requires Roles = Admin.
        [Fact]
        public void Test10_Controller_IsAdminOnly_IncludingProductionChanges()
        {
            var controller = typeof(AdminPaymentSettingsController);

            var authorize = controller.GetCustomAttribute<AuthorizeAttribute>();
            Assert.NotNull(authorize);
            Assert.Equal(Roles.Admin, authorize!.Roles);
            Assert.Equal("api/admin/payment-settings", controller.GetCustomAttribute<RouteAttribute>()!.Template);

            // No action may loosen that (AllowAnonymous or a broader role list).
            foreach (var action in controller.GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly))
            {
                Assert.Null(action.GetCustomAttribute<AllowAnonymousAttribute>());
                var actionAuth = action.GetCustomAttribute<AuthorizeAttribute>();
                Assert.True(actionAuth == null || actionAuth.Roles == Roles.Admin);
            }
        }

        // Test 10 (part 2): a Production switch is persisted together with the
        // admin who made it.
        [Fact]
        public async Task Test10_UpdateToProduction_IsSavedWithAuditFields()
        {
            var repo = new FakeRepository();
            var service = new PaymentSettingsService(repo);
            var adminId = Guid.NewGuid();
            var before = DateTime.UtcNow;

            var result = await service.UpdateAsync(ValidRequest(), adminId);

            Assert.True(result.Success);
            Assert.Equal(1, repo.Saves);
            Assert.Equal(PaymentEnvironment.Production, repo.Current!.Environment);
            Assert.Equal(adminId, repo.Current.UpdatedByUserId);
            Assert.True(repo.Current.UpdatedAt >= before);
            Assert.Equal("INR", repo.Current.Currency);
            Assert.Equal(6m, repo.Current.PlatformFeePercent);
        }

        [Fact]
        public async Task Update_NegativePercent_IsRejected_AndNothingSaved()
        {
            var repo = new FakeRepository();
            var request = ValidRequest();
            request.GatewayGstPercent = -1m;

            var result = await new PaymentSettingsService(repo).UpdateAsync(request, Guid.NewGuid());

            Assert.False(result.Success);
            Assert.Equal(0, repo.Saves);
        }

        [Fact]
        public async Task Update_NonInrCurrency_IsRejected()
        {
            var request = ValidRequest();
            request.Currency = "USD";

            var result = await new PaymentSettingsService(new FakeRepository()).UpdateAsync(request, Guid.NewGuid());

            Assert.False(result.Success);
        }

        [Fact]
        public async Task Update_MissingFields_AreRejected_NotDefaultedToZero()
        {
            var request = ValidRequest();
            request.PlatformFeePercent = null;

            var result = await new PaymentSettingsService(new FakeRepository()).UpdateAsync(request, Guid.NewGuid());

            Assert.False(result.Success);
        }

        [Fact]
        public async Task Update_UndefinedEnumValue_IsRejected()
        {
            var request = ValidRequest();
            request.PricingMode = (PaymentPricingMode)99;

            var result = await new PaymentSettingsService(new FakeRepository()).UpdateAsync(request, Guid.NewGuid());

            Assert.False(result.Success);
        }

        [Fact]
        public async Task Get_CreatesDefaultRow_WhenTableIsEmpty()
        {
            var repo = new FakeRepository { Current = null };

            var dto = await new PaymentSettingsService(repo).GetAsync();

            Assert.Equal(PaymentEnvironment.Sandbox, dto.Environment);
            Assert.Equal(PaymentPricingMode.CurrentOffer, dto.PricingMode);
            Assert.Equal(5.00m, dto.PlatformFeePercent);
            Assert.Equal(1.95m, dto.GatewayFeePercent);
            Assert.Equal(18.00m, dto.GatewayGstPercent);
            Assert.Equal("INR", dto.Currency);
        }

        [Fact]
        public void SettingsDto_ExposesNoCredentialFields()
        {
            var names = typeof(PaymentSettingsDto).GetProperties().Select(p => p.Name.ToLowerInvariant());

            Assert.DoesNotContain(names, n => n.Contains("secret") || n.Contains("appid") || n.Contains("key") || n.Contains("password"));
        }
    }
}
