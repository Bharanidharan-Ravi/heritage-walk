using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ArchaeoTrails.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PaymentSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Provider = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Environment = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false),
                    PlatformFeePercent = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    GatewayFeePercent = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    GatewayGstPercent = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    PricingMode = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PaymentSettings", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "PaymentSettings",
                columns: new[] { "Id", "CreatedAt", "Currency", "Environment", "GatewayFeePercent", "GatewayGstPercent", "IsEnabled", "PlatformFeePercent", "PricingMode", "Provider", "UpdatedAt", "UpdatedByUserId" },
                values: new object[] { new Guid("5d0f2c4e-7a1b-4c39-9e6a-3b8f1d2a4c70"), new DateTime(2026, 9, 20, 0, 0, 0, 0, DateTimeKind.Utc), "INR", "Sandbox", 1.95m, 18.00m, true, 5.00m, "CurrentOffer", "Cashfree", new DateTime(2026, 9, 20, 0, 0, 0, 0, DateTimeKind.Utc), null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PaymentSettings");
        }
    }
}
