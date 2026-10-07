using System.Text;
using System.Threading.RateLimiting;
using ArchaeoTrails.Api.Background;
using ArchaeoTrails.Api.Controllers;
using ArchaeoTrails.Api.Debugging;
using ArchaeoTrails.Api.Hubs;
using ArchaeoTrails.Api.RealTime;
using ArchaeoTrails.Application.Interfaces;
using ArchaeoTrails.Application.Services;
using ArchaeoTrails.Application.Services.Pricing;
using ArchaeoTrails.Domain.Constants;
using ArchaeoTrails.Infrastructure.Data;
using ArchaeoTrails.Infrastructure.Identity;
using ArchaeoTrails.Infrastructure.Repositories;
using ArchaeoTrails.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
// TODO(form-generator): requires Microsoft.EntityFrameworkCore.SqlServer — see docs/form-generator/MASTER_PROMPT.md §7
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    // Adds the "Authorize" button in Swagger UI so protected endpoints
    // (e.g. [Authorize(Roles = Roles.Admin)] on UsersController) can be
    // tested: POST /api/auth/login to get a token, then Authorize with
    // "Bearer <token>". Without this, Swagger has no way to attach a
    // token and every protected route correctly returns 401.
    var jwtScheme = new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Paste the raw JWT from POST /api/auth/login (no need to type \"Bearer \" — Swagger adds it)."
    };
    options.AddSecurityDefinition("Bearer", jwtScheme);
    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        { new Microsoft.OpenApi.Models.OpenApiSecurityScheme { Reference = new Microsoft.OpenApi.Models.OpenApiReference { Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme, Id = "Bearer" } }, Array.Empty<string>() }
    });
});
builder.Services.AddScoped<IEmailService, ZohoEmailService>();

// --- Form Generator (dry scaffold) ---------------------------------------
// TODO(form-generator): set ConnectionStrings:AzureSql via `dotnet user-secrets`
// (dev) or Azure App Service configuration (prod) — never in appsettings.json.
//
// Development uses a local SQL Server (SqlServerConnection) so iterating on
// migrations doesn't burn Azure free-tier compute; every other environment
// uses Azure SQL (AzureSql). Both live in `dotnet user-secrets` (dev) or the
// App Service's Connection strings (prod) — never in appsettings.json.
var connectionName = builder.Environment.IsDevelopment() ? "SqlServerConnection" : "AzureSql";
var connectionString = builder.Configuration.GetConnectionString(connectionName);
if (string.IsNullOrWhiteSpace(connectionString) || connectionString == "REPLACE_ME")
{
    throw new InvalidOperationException(
        $"ConnectionStrings:{connectionName} is not configured. In Development, run " +
        $"`dotnet user-secrets set \"ConnectionStrings:{connectionName}\" \"<connection string>\"` " +
        "from ArchaeoTrails.Api. In Production, add it under the App Service's " +
        "Configuration → Connection strings.");
}
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(connectionString, sqlOptions => sqlOptions.EnableRetryOnFailure()));

builder.Services.AddScoped<IFormTemplateRepository, EfFormTemplateRepository>();
builder.Services.AddScoped<IFormSubmissionRepository, EfFormSubmissionRepository>();
builder.Services.AddHttpClient<IPaymentService, RazorpayPaymentService>();
builder.Services.AddScoped<IQrCodeService, QrCodeService>();

// --- Payment & Pricing (phase 1: configuration + pricing engine only) ------
// No gateway calls yet; Cashfree credentials will come from user-secrets /
// App Service config in the next phase, never from PaymentSettings.
builder.Services.AddScoped<IPaymentSettingsRepository, EfPaymentSettingsRepository>();
builder.Services.AddScoped<IPaymentSettingsService, PaymentSettingsService>();
builder.Services.AddSingleton<IGatewayCostStrategy, StandardGatewayCostStrategy>();
builder.Services.AddSingleton<IGatewayCostStrategy, CurrentOfferGatewayCostStrategy>();
builder.Services.AddSingleton<IGatewayCostStrategy, CustomGatewayCostStrategy>();
builder.Services.AddSingleton<IPricingService, PricingService>();

// --- Bookings: Pay Now via Cashfree ----------------------------------------
// Keys come from `dotnet user-secrets` (dev) or Azure App Service config
// (Cashfree__Sandbox__AppId / __SecretKey and Cashfree__Production__AppId /
// __SecretKey) — never appsettings.json. Which pair is used follows
// PaymentSettings.Environment (Admin → Payment settings).
builder.Services.AddHttpClient<IPaymentGateway, CashfreePaymentGateway>();
var bookingOptions = builder.Configuration.GetSection("Bookings").Get<BookingOptions>() ?? new BookingOptions();
// The confirmation email links to the same /booking/{order_id} page Cashfree returns to.
bookingOptions.BookingUrlTemplate ??= builder.Configuration["Cashfree:ReturnUrl"];
builder.Services.AddSingleton(bookingOptions);
builder.Services.AddScoped<IPaymentWebhookEventRepository, EfPaymentWebhookEventRepository>();
builder.Services.AddScoped<IBookingService, BookingService>();
// Marks unpaid holds Expired (or confirms them if Cashfree says they were paid).
builder.Services.AddHostedService<BookingExpiryWorker>();

// Public booking routes are rate-limited per client IP (built into ASP.NET
// Core — no package). Polling the confirmation page is ~12 reads per booking,
// so the read limit leaves plenty of room; each write calls Cashfree.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, token) =>
    {
        await context.HttpContext.Response.WriteAsJsonAsync(
            new { status = "error", message = "Too many requests — please wait a minute and try again." }, token);
    };
    options.AddPolicy(RateLimitPolicies.BookingRead, http => PerIpLimit(http, 60));
    options.AddPolicy(RateLimitPolicies.BookingWrite, http => PerIpLimit(http, 10));
});

// --- Experiences module (Walk/Seminar/Course builder + approval workflow) ---
// Sanity:WriteToken is placeholder-only ("REPLACE_ME") in appsettings.json —
// see SanityContentService for the dry-scaffold behaviour until a real token
// is added via dotnet user-secrets (dev) or Azure App Service config (prod).
builder.Services.AddScoped<IExperienceTemplateRepository, EfExperienceTemplateRepository>();
// Typed HttpClient (not plain AddScoped) — SanityContentService.UploadImageAssetAsync
// makes real outbound calls to Sanity's asset API once Sanity:WriteToken is set.
builder.Services.AddHttpClient<ISanityContentService, SanityContentService>();

// Real-time push (approval workflow + booking capacity) — see
// IExperienceEventPublisher's doc comment for the event catalogue. SignalR
// itself needs no NuGet package (built into the ASP.NET Core shared
// framework); AddSignalR() is called further below, after JWT auth is
// configured, since its JwtBearerEvents wiring references ExperienceHub.
builder.Services.AddScoped<IExperienceEventPublisher, SignalRExperienceEventPublisher>();

// --- Admin panel: Identity (Admin/Employee/User roles) + JWT auth --------
// Jwt:* / SeedAdmin:* are placeholder-only ("REPLACE_ME") in appsettings.json.
// Real values come from:
//   - Development: `dotnet user-secrets` against ArchaeoTrails.Api's
//     UserSecretsId — never committed (secrets.json lives outside the repo).
//   - Production: the archaeotrails-api Azure App Service's Application
//     Settings, using the double-underscore env-var form (Jwt__Key,
//     Jwt__Issuer, Jwt__Audience, Jwt__ExpiryMinutes, SeedAdmin__UserName,
//     SeedAdmin__Email, SeedAdmin__Password) — the config binder maps "__" to ":"
//     automatically, so no code change is needed to read them there.
// This is a separate trust boundary from Microsoft Entra: there is no Entra
// App Registration involved in this JWT scheme. Entra Managed Identity is
// used only for the "Active Directory Default" Azure SQL connection below.
builder.Services
    .AddIdentityCore<ApplicationUser>(options =>
    {
        options.Password.RequiredLength = 8;
        options.Password.RequireNonAlphanumeric = false;
        options.User.RequireUniqueEmail = true;
        // Usernames are Admin-entered handles, separate from the email.
        // Deliberately WIDER than Domain.Constants.UserNameRules (which is what
        // new/renamed usernames are validated against): accounts provisioned
        // before usernames existed still carry their email address as the
        // username, and Identity re-validates the username on every
        // UpdateAsync — so "@" and "+" must stay legal here or a simple
        // activate/deactivate on such a legacy account would fail. Rename
        // those accounts from Users & Roles to move them onto the new rules.
        options.User.AllowedUserNameCharacters =
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-@+";
    })
    .AddRoles<IdentityRole<Guid>>()
    .AddEntityFrameworkStores<AppDbContext>()
    // Required by UserManagementService's admin password reset, which uses
    // GeneratePasswordResetTokenAsync so the old password isn't needed.
    .AddDefaultTokenProviders();

var debugErrors = DebugErrors.IsEnabled(builder.Configuration);

var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey == "REPLACE_ME")
{
    // Fail fast rather than ever falling back to a predictable/hardcoded key.
    throw new InvalidOperationException(
        "Jwt:Key is not configured. In Development, run " +
        "`dotnet user-secrets set \"Jwt:Key\" \"<64+ random bytes, base64>\"` " +
        "from ArchaeoTrails.Api. In Production, set the Jwt__Key Application " +
        "Setting on the archaeotrails-api App Service. Refusing to start with " +
        "an unset/placeholder signing key.");
}

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "ArchaeoTrailsApi",
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "ArchaeoTrailsAdminPanel",
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1)
        };

        // SignalR: a browser can't set an Authorization header on the
        // WebSocket upgrade request, so the client sends the JWT as an
        // "access_token" query string param instead (see
        // src/signalr/experienceHubClient.js's accessTokenFactory). Only
        // honor that fallback for the hub path — every other endpoint still
        // requires a real Authorization header.
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };

        // Debug:DetailedErrors — explains 401/403 in the response body.
        DebugErrors.Attach(options.Events, debugErrors);
    });

builder.Services.AddAuthorization();

builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserManagementService, UserManagementService>();

// Built into the ASP.NET Core shared framework — no NuGet package needed.
builder.Services.AddSignalR();

// Cors:AllowedOrigins in appsettings.json; add an origin in production without
// a code change via App Service settings (Cors__AllowedOrigins__3 = https://…).
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
if (allowedOrigins is not { Length: > 0 })
{
    allowedOrigins = new[] { "http://localhost:5173", "https://archaeotrails.com", "https://www.archaeotrails.com" };
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
               .AllowAnyHeader()
              .AllowAnyMethod()
              // Required for SignalR's negotiate/WebSocket handshake. Safe
              // alongside AllowAnyHeader/AllowAnyMethod here because the
              // origins list above is explicit (not AllowAnyOrigin, which
              // .NET refuses to combine with AllowCredentials anyway).
              .AllowCredentials();
    });
});
var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (debugErrors)
{
    // Debug:DetailedErrors — full exception details in 500 responses.
    app.UseDebugExceptions();
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<ExperienceHub>("/hubs/experience");

// Seed Admin/Employee/User roles, and an initial Admin account if SeedAdmin
// config is set — see IdentitySeeder for why this is safe to no-op otherwise.
using (var scope = app.Services.CreateScope())
{
    await IdentitySeeder.SeedAsync(scope.ServiceProvider);
}

app.Run();

// A fixed one-minute window per client IP.
static RateLimitPartition<string> PerIpLimit(HttpContext http, int perMinute) =>
    RateLimitPartition.GetFixedWindowLimiter(
        http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = perMinute,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0
        });
