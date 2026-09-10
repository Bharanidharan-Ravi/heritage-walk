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
    /// TODO(admin-panel): SeedAdmin:UserName / SeedAdmin:Email /
    /// SeedAdmin:Password are placeholder-only in appsettings.json — set real
    /// values via `dotnet user-secrets` (dev) or Azure App Service
    /// configuration (prod). If Email/Password are left as "REPLACE_ME", no
    /// admin account is seeded and you must create the first Admin manually
    /// (e.g. temporarily via a direct DB insert or by relaxing an endpoint) —
    /// this is intentional so no default credential is ever shipped.
    ///
    /// SeedAdmin:UserName is the login handle for that first Admin and is
    /// separate from the email; if it is unset/placeholder/invalid it falls
    /// back to "admin". Every other account is then created by this Admin
    /// through POST /api/users, which requires a manually entered username.
    /// </summary>
    public static class IdentitySeeder
    {
        private const string DefaultAdminUserName = "admin";

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

            var configuredUserName = configuration["SeedAdmin:UserName"];
            var adminUserName = UserNameRules.IsValid(configuredUserName) && configuredUserName != "REPLACE_ME"
                ? configuredUserName!.Trim()
                : DefaultAdminUserName;

            if (await userManager.FindByEmailAsync(adminEmail) is not null) return;

            if (await userManager.FindByNameAsync(adminUserName) is not null)
            {
                logger.LogWarning(
                    "Username {UserName} is already taken — skipping initial Admin seed. " +
                    "Set a different SeedAdmin:UserName.", adminUserName);
                return;
            }

            var admin = new ApplicationUser
            {
                UserName = adminUserName,
                Email = adminEmail,
                FullName = "Administrator",
                IsActive = true
            };

            var createResult = await userManager.CreateAsync(admin, adminPassword);
            if (createResult.Succeeded)
            {
                await userManager.AddToRoleAsync(admin, Roles.Admin);
                logger.LogInformation(
                    "Seeded initial Admin account {UserName} ({Email}). Sign in with the username, not the email.",
                    adminUserName, adminEmail);
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
