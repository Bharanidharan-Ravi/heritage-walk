using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ArchaeoTrails.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCashfreeBookings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_FormSubmissions_FormTemplateId",
                table: "FormSubmissions");

            // Renamed, not dropped — keeps existing rows' order / payment ids.
            migrationBuilder.RenameColumn(
                name: "RazorpayOrderId",
                table: "FormSubmissions",
                newName: "GatewayOrderId");

            migrationBuilder.RenameColumn(
                name: "RazorpayPaymentId",
                table: "FormSubmissions",
                newName: "GatewayPaymentId");

            migrationBuilder.AlterColumn<string>(
                name: "GatewayOrderId",
                table: "FormSubmissions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "GatewayPaymentId",
                table: "FormSubmissions",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BookingRef",
                table: "FormSubmissions",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ExperienceTemplateId",
                table: "FormSubmissions",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ExpiresAt",
                table: "FormSubmissions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GatewaySessionId",
                table: "FormSubmissions",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PaidAt",
                table: "FormSubmissions",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PaymentGateway",
                table: "FormSubmissions",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Quantity",
                table: "FormSubmissions",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<string>(
                name: "RegistrationType",
                table: "FormSubmissions",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SubmitterPhone",
                table: "FormSubmissions",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PrivatePrice",
                table: "ExperienceTemplates",
                type: "decimal(10,2)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_FormSubmissions_BookingRef",
                table: "FormSubmissions",
                column: "BookingRef",
                unique: true,
                filter: "[BookingRef] IS NOT NULL");

            // Legacy paid rows came through the old Razorpay form flow.
            migrationBuilder.Sql(
                "UPDATE FormSubmissions SET PaymentGateway = 'Razorpay' WHERE GatewayOrderId <> '' AND PaymentGateway IS NULL;");

            migrationBuilder.CreateIndex(
                name: "IX_FormSubmissions_FormTemplateId_Status",
                table: "FormSubmissions",
                columns: new[] { "FormTemplateId", "Status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_FormSubmissions_BookingRef",
                table: "FormSubmissions");

            migrationBuilder.DropIndex(
                name: "IX_FormSubmissions_FormTemplateId_Status",
                table: "FormSubmissions");

            migrationBuilder.DropColumn(
                name: "BookingRef",
                table: "FormSubmissions");

            migrationBuilder.DropColumn(
                name: "ExperienceTemplateId",
                table: "FormSubmissions");

            migrationBuilder.DropColumn(
                name: "ExpiresAt",
                table: "FormSubmissions");

            migrationBuilder.DropColumn(
                name: "GatewaySessionId",
                table: "FormSubmissions");

            migrationBuilder.DropColumn(
                name: "PaidAt",
                table: "FormSubmissions");

            migrationBuilder.DropColumn(
                name: "PaymentGateway",
                table: "FormSubmissions");

            migrationBuilder.DropColumn(
                name: "Quantity",
                table: "FormSubmissions");

            migrationBuilder.DropColumn(
                name: "RegistrationType",
                table: "FormSubmissions");

            migrationBuilder.DropColumn(
                name: "SubmitterPhone",
                table: "FormSubmissions");

            migrationBuilder.DropColumn(
                name: "PrivatePrice",
                table: "ExperienceTemplates");

            migrationBuilder.AlterColumn<string>(
                name: "GatewayOrderId",
                table: "FormSubmissions",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<string>(
                name: "GatewayPaymentId",
                table: "FormSubmissions",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(100)",
                oldMaxLength: 100,
                oldNullable: true);

            migrationBuilder.RenameColumn(
                name: "GatewayOrderId",
                table: "FormSubmissions",
                newName: "RazorpayOrderId");

            migrationBuilder.RenameColumn(
                name: "GatewayPaymentId",
                table: "FormSubmissions",
                newName: "RazorpayPaymentId");

            migrationBuilder.CreateIndex(
                name: "IX_FormSubmissions_FormTemplateId",
                table: "FormSubmissions",
                column: "FormTemplateId");
        }
    }
}
