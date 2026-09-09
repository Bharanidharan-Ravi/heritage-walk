using System;
using ArchaeoTrails.Domain.Entities;
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

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Required first — sets up the AspNetUsers/AspNetRoles/... tables.
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<ApplicationUser>(entity =>
            {
                entity.Property(u => u.FullName).HasMaxLength(200);
            });

            modelBuilder.Entity<FormTemplate>(entity =>
            {
                entity.HasIndex(t => t.Slug).IsUnique();
                entity.Property(t => t.Title).HasMaxLength(200).IsRequired();
                entity.Property(t => t.Slug).HasMaxLength(200).IsRequired();
                entity.Property(t => t.Price).HasColumnType("decimal(10,2)");
            });

            modelBuilder.Entity<FormSubmission>(entity =>
            {
                entity.Property(s => s.AmountPaid).HasColumnType("decimal(10,2)");
                entity.HasOne(s => s.FormTemplate)
                      .WithMany(t => t.FormSubmissions)
                      .HasForeignKey(s => s.FormTemplateId)
                      .OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}
