using System.Text;
using ArchaeoTrails.Api.Hubs;
using ArchaeoTrails.Api.RealTime;
using ArchaeoTrails.Application.Interfaces;
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
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("AzureSql"),
        sqlOptions => sqlOptions.EnableRetryOnFailure()));

builder.Services.AddScoped<IFormTemplateRepository, EfFormTemplateRepository>();
builder.Services.AddScoped<IFormSubmissionRepository, EfFormSubmissionRepository>();
builder.Services.AddScoped<IPaymentService, RazorpayPaymentService>();
builder.Services.AddScoped<IQrCodeService, QrCodeService>();

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
    });

builder.Services.AddAuthorization();

builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserManagementService, UserManagementService>();

// Built into the ASP.NET Core shared framework — no NuGet package needed.
builder.Services.AddSignalR();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                 "http://localhost:5173",
                 "https://archaeotrails.com",
                 "https://www.archaeotrails.com"
             ) // Update this to your React app's local/prod URL
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

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
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
