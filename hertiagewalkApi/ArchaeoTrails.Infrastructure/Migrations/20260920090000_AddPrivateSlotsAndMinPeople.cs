using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ArchaeoTrails.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPrivateSlotsAndMinPeople : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "PrivateMinPeople",
                table: "ExperienceTemplates",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<string>(
                name: "PrivateSlotsJson",
                table: "ExperienceTemplates",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "[]");

            // RegistrationType values are unchanged (0 was Individual, now Group).
            // SlotsJson used to hold the PRIVATE dates for rows offering Private
            // (1) or Both (2); move them across so those bookings keep their
            // dates. Group-only rows (0) never had slots.
            migrationBuilder.Sql(
                "UPDATE ExperienceTemplates SET PrivateSlotsJson = SlotsJson, SlotsJson = '[]' WHERE RegistrationType IN (1, 2)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "UPDATE ExperienceTemplates SET SlotsJson = PrivateSlotsJson WHERE RegistrationType IN (1, 2)");

            migrationBuilder.DropColumn(
                name: "PrivateMinPeople",
                table: "ExperienceTemplates");

            migrationBuilder.DropColumn(
                name: "PrivateSlotsJson",
                table: "ExperienceTemplates");
        }
    }
}
