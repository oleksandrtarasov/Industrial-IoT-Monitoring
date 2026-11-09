using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IndustrialIoT.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class error_added_to_command : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Error",
                table: "Commands",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Error",
                table: "Commands");
        }
    }
}
