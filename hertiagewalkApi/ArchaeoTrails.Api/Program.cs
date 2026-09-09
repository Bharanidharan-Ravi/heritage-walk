using System.Text;
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
builder.Services.AddSwaggerGen();
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

// --- Admin panel: Identity (Admin/Employee/User roles) + JWT auth --------
// TODO(admin-panel): Jwt:Key and SeedAdmin:Email/Password are placeholder-only
// in appsettings.json — set real values via `dotnet user-secrets` (dev) or
// Azure App Service configuration (prod). See CLAUDE.md.
builder.Services
    .AddIdentityCore<ApplicationUser>(options =>
    {
        options.Password.RequiredLength = 8;
        options.Password.RequireNonAlphanumeric = false;
        options.User.RequireUniqueEmail = true;
    })
    .AddRoles<IdentityRole<Guid>>()
    .AddEntityFrameworkStores<AppDbContext>();

var jwtKey = builder.Configuration["Jwt:Key"] ?? "REPLACE_ME_INSECURE_DEV_ONLY_KEY_1234567890";
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
    });

builder.Services.AddAuthorization();

builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserManagementService, UserManagementService>();

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
              .AllowAnyMethod();
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

// Seed Admin/Employee/User roles, and an initial Admin account if SeedAdmin
// config is set — see IdentitySeeder for why this is safe to no-op otherwise.
using (var scope = app.Services.CreateScope())
{
    await IdentitySeeder.SeedAsync(scope.ServiceProvider);
}

app.Run();
