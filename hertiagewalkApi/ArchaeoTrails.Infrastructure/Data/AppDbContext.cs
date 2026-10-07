using System;
using ArchaeoTrails.Domain.Entities;
using ArchaeoTrails.Infrastructure.Data.Configurations;
using ArchaeoTrails.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace ArchaeoTrails.Infrastructure.Data
{
    /// <summary>
    /// EF Core context targeting Azure SQL Database via the passwordless
    /// (Active Directory Default) connection string in ConnectionStrings:AzureSql.
    ///
    /// Extends IdentityDbContext to add the admin-panel login/roles tables
    /// (AspNetUsers, AspNetRoles, ...) alongside the existing form-generator
    /// tables. See docs/form-generator/MASTER_PROMPT.md for FormTemplate/
    /// FormSubmission and CLAUDE.md for the admin panel.
    /// </summary>
    public class AppDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<FormTemplate> FormTemplates => Set<FormTemplate>();
        public DbSet<FormSubmission> FormSubmissions => Set<FormSubmission>();
        public DbSet<ExperienceTemplate> ExperienceTemplates => Set<ExperienceTemplate>();
        public DbSet<PaymentSettings> PaymentSettings => Set<PaymentSettings>();
        public DbSet<PaymentWebhookEvent> PaymentWebhookEvents => Set<PaymentWebhookEvent>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Required first — sets up the AspNetUsers/AspNetRoles/... tables.
            base.OnModelCreating(modelBuilder);

            modelBuilder.ApplyConfiguration(new PaymentSettingsConfiguration());

            modelBuilder.Entity<ApplicationUser>(entity =>
            {
                entity.Property(u => u.FullName).HasMaxLength(200);
            });

            modelBuilder.Entity<FormTemplate>(entity =>
            {
                entity.HasIndex(t => t.Slug).IsUnique();
                entity.Property(t => t.Title).HasMaxLength(200).IsRequired();
                entity.Property(t => t.Slug).HasMaxLength(200).IsRequired();
                entity.Property(t => t.Description).HasMaxLength(1000);
                entity.Property(t => t.Price).HasColumnType("decimal(10,2)");
            });

            modelBuilder.Entity<FormSubmission>(entity =>
            {
                entity.Property(s => s.AmountPaid).HasColumnType("decimal(10,2)");
                // Nullable + unique: SQL Server filters out NULLs, so legacy rows
                // without a booking ref don't collide.
                entity.HasIndex(s => s.BookingRef).IsUnique();
                entity.Property(s => s.BookingRef).HasMaxLength(20);
                entity.Property(s => s.PaymentGateway).HasMaxLength(20);
                entity.Property(s => s.GatewayOrderId).HasMaxLength(100);
                entity.Property(s => s.GatewayPaymentId).HasMaxLength(100);
                entity.Property(s => s.GatewaySessionId).HasMaxLength(500);
                entity.Property(s => s.SubmitterPhone).HasMaxLength(20);
                entity.Property(s => s.RegistrationType).HasMaxLength(20);
                entity.HasIndex(s => new { s.FormTemplateId, s.Status });
                // The expiry worker's "pending holds that ran out" scan.
                entity.HasIndex(s => new { s.Status, s.ExpiresAt });
                entity.HasOne(s => s.FormTemplate)
                      .WithMany(t => t.FormSubmissions)
                      .HasForeignKey(s => s.FormTemplateId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<PaymentWebhookEvent>(entity =>
            {
                entity.Property(e => e.Gateway).HasMaxLength(20).IsRequired();
                entity.Property(e => e.EventType).HasMaxLength(100);
                entity.Property(e => e.GatewayOrderId).HasMaxLength(100);
                entity.Property(e => e.Outcome).HasMaxLength(500);
                entity.HasIndex(e => e.GatewayOrderId);
                entity.HasIndex(e => e.ReceivedAt);
            });

            modelBuilder.Entity<ExperienceTemplate>(entity =>
            {
                entity.Property(e => e.Title).HasMaxLength(200).IsRequired();
                entity.Property(e => e.Price).HasColumnType("decimal(10,2)");
                entity.Property(e => e.PrivatePrice).HasColumnType("decimal(10,2)");
                entity.Property(e => e.ChangesRequestedReason).HasMaxLength(2000);
                entity.Property(e => e.LastSyncError).HasMaxLength(2000);
                entity.HasIndex(e => e.Status);
                entity.HasIndex(e => e.Type);
                entity.HasIndex(e => e.CreatedByUserId);
                entity.HasIndex(e => e.IsTest);
                // A form must be deletable without taking the experience down with
                // it — the experience simply loses its booking link.
                entity.HasOne<FormTemplate>()
                      .WithMany()
                      .HasForeignKey(e => e.LinkedFormTemplateId)
                      .OnDelete(DeleteBehavior.SetNull);
            });
        }
    }
}
