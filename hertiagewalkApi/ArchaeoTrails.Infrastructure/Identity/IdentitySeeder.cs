using System;
using System.Linq;
using System.Threading.Tasks;
using ArchaeoTrails.Domain.Constants;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace ArchaeoTrails.Infrastructure.Identity
{
    /// <summary>
    /// Ensures the Admin/Employee/User roles exist and, if configured, that at
    /// least one Admin account exists so the panel isn't a locked box on first
    /// deploy. Call once from Program.cs at startup.
    ///
    /// TODO(admin-panel): SeedAdmin:Email / SeedAdmin:Password are
    /// placeholder-only in appsettings.json — set real values via
    /// `dotnet user-secrets` (dev) or Azure App Service configuration (prod).
    /// If left as "REPLACE_ME", no admin account is seeded and you must create
    /// the first Admin manually (e.g. temporarily via a direct DB insert or by
    /// relaxing an endpoint) — this is intentional so no default credential is
    /// ever shipped.
    /// </summary>
    public static class IdentitySeeder
    {
        public static async Task SeedAsync(IServiceProvider services)
        {
            var roleManager = services.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
            var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
            var configuration = services.GetRequiredService<IConfiguration>();
            var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(IdentitySeeder));

            foreach (var role in Roles.All)
            {
                if (!await roleManager.RoleExistsAsync(role))
                {
                    await roleManager.CreateAsync(new IdentityRole<Guid>(role));
                }
            }

            var adminEmail = configuration["SeedAdmin:Email"];
            var adminPassword = configuration["SeedAdmin:Password"];

            if (string.IsNullOrWhiteSpace(adminEmail) || adminEmail == "REPLACE_ME" ||
                string.IsNullOrWhiteSpace(adminPassword) || adminPassword == "REPLACE_ME")
            {
                logger.LogWarning(
                    "SeedAdmin:Email/Password are not configured — skipping initial Admin seed. " +
                    "Set them via dotnet user-secrets (dev) or App Service configuration (prod).");
                return;
            }

            var existing = await userManager.FindByEmailAsync(adminEmail);
            if (existing is not null) return;

            var admin = new ApplicationUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                FullName = "Administrator",
                IsActive = true
            };

            var createResult = await userManager.CreateAsync(admin, adminPassword);
            if (createResult.Succeeded)
            {
                await userManager.AddToRoleAsync(admin, Roles.Admin);
                logger.LogInformation("Seeded initial Admin account {Email}.", adminEmail);
            }
            else
            {
                logger.LogError(
                    "Failed to seed initial Admin account: {Errors}",
                    string.Join("; ", createResult.Errors.Select(e => e.Description)));
            }
        }
    }
}
