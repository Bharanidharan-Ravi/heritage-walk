using ArchaeoTrails.Application.Interfaces;
using ArchaeoTrails.Infrastructure.Data;
using ArchaeoTrails.Infrastructure.Repositories;
using ArchaeoTrails.Infrastructure.Services;
// TODO(form-generator): requires Microsoft.EntityFrameworkCore.SqlServer — see docs/form-generator/MASTER_PROMPT.md §7
using Microsoft.EntityFrameworkCore;

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
    options.UseSqlServer(builder.Configuration.GetConnectionString("AzureSql")));

builder.Services.AddScoped<IFormTemplateRepository, EfFormTemplateRepository>();
builder.Services.AddScoped<IFormSubmissionRepository, EfFormSubmissionRepository>();
builder.Services.AddScoped<IPaymentService, RazorpayPaymentService>();
builder.Services.AddScoped<IQrCodeService, QrCodeService>();
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
app.UseAuthorization();

app.MapControllers();

app.Run();
