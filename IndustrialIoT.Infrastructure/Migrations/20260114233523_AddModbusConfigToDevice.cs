using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IndustrialIoT.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddModbusConfigToDevice : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ModbusAddress",
                table: "Sensors",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "Scale",
                table: "Sensors",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ModbusIpAddress",
                table: "Devices",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ModbusPort",
                table: "Devices",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<byte>(
                name: "ModbusUnitId",
                table: "Devices",
                type: "smallint",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ModbusAddress",
                table: "Sensors");

            migrationBuilder.DropColumn(
                name: "Scale",
                table: "Sensors");

            migrationBuilder.DropColumn(
                name: "ModbusIpAddress",
                table: "Devices");

            migrationBuilder.DropColumn(
                name: "ModbusPort",
                table: "Devices");

            migrationBuilder.DropColumn(
                name: "ModbusUnitId",
                table: "Devices");
        }
    }
}
