using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ArchaeoTrails.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddExperienceIsTest : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Existing rows default to false = live site.
            migrationBuilder.AddColumn<bool>(
                name: "IsTest",
                table: "ExperienceTemplates",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_ExperienceTemplates_IsTest",
                table: "ExperienceTemplates",
                column: "IsTest");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ExperienceTemplates_IsTest",
                table: "ExperienceTemplates");

            migrationBuilder.DropColumn(
                name: "IsTest",
                table: "ExperienceTemplates");
        }
    }
}
