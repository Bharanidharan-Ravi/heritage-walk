using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ArchaeoTrails.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddExperienceTemplate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ExperienceTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ContentBlocksJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SanityDocumentId = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SanitySyncStatus = table.Column<int>(type: "int", nullable: false),
                    LastSyncError = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    LastSyncedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RequiresPayment = table.Column<bool>(type: "bit", nullable: false),
                    Price = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CapacityTotal = table.Column<int>(type: "int", nullable: true),
                    CapacityRemaining = table.Column<int>(type: "int", nullable: true),
                    LinkedFormTemplateId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    BookingEndDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ApprovedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ChangesRequestedReason = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ApprovedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    PublishedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ClosedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExperienceTemplates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExperienceTemplates_FormTemplates_LinkedFormTemplateId",
                        column: x => x.LinkedFormTemplateId,
                        principalTable: "FormTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ExperienceTemplates_CreatedByUserId",
                table: "ExperienceTemplates",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ExperienceTemplates_LinkedFormTemplateId",
                table: "ExperienceTemplates",
                column: "LinkedFormTemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_ExperienceTemplates_Status",
                table: "ExperienceTemplates",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ExperienceTemplates_Type",
                table: "ExperienceTemplates",
                column: "Type");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ExperienceTemplates");
        }
    }
}
