using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ArchaeoTrails.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentWebhookEvents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PaymentWebhookEvents",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Gateway = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    EventType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    GatewayOrderId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    RawBody = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ReceivedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ProcessedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Outcome = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentWebhookEvents", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_FormSubmissions_Status_ExpiresAt",
                table: "FormSubmissions",
                columns: new[] { "Status", "ExpiresAt" });

            migrationBuilder.CreateIndex(
                name: "IX_PaymentWebhookEvents_GatewayOrderId",
                table: "PaymentWebhookEvents",
                column: "GatewayOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_PaymentWebhookEvents_ReceivedAt",
                table: "PaymentWebhookEvents",
                column: "ReceivedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PaymentWebhookEvents");

            migrationBuilder.DropIndex(
                name: "IX_FormSubmissions_Status_ExpiresAt",
                table: "FormSubmissions");
        }
    }
}
