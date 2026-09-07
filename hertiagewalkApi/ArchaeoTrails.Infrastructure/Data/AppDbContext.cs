using ArchaeoTrails.Domain.Entities;
using Microsoft.EntityFrameworkCore; // TODO(form-generator): requires Microsoft.EntityFrameworkCore.SqlServer + .Design — see MASTER_PROMPT.md §7

namespace ArchaeoTrails.Infrastructure.Data
{
    /// <summary>
    /// EF Core context targeting Azure SQL Database. Does not compile until
    /// the EF Core NuGet packages are added to ArchaeoTrails.Infrastructure.csproj.
    /// </summary>
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<FormTemplate> FormTemplates => Set<FormTemplate>();
        public DbSet<FormSubmission> FormSubmissions => Set<FormSubmission>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
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
