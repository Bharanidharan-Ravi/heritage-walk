using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ArchaeoTrails.Infrastructure.Migrations
{
    /// <summary>
    /// Payment becomes just another switch on a form (RequiresPayment), and a
    /// form gains an optional Description shown under its title.
    ///
    /// Existing rows keep RequiresPayment = true so already-shared paid forms
    /// behave exactly as before. Field layout (width/options/help text) needs no
    /// column of its own — it rides along inside the existing FieldsJson.
    /// </summary>
    public partial class AddOptionalPaymentAndFormLayout : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "FormTemplates",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "RequiresPayment",
                table: "FormTemplates",
                type: "bit",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Description",
                table: "FormTemplates");

            migrationBuilder.DropColumn(
                name: "RequiresPayment",
                table: "FormTemplates");
        }
    }
}
