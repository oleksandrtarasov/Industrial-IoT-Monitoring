using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IndustrialIoT.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCommandRetryMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // The retry columns existed in some local databases before the
            // exploratory migrations were consolidated into this migration.
            migrationBuilder.Sql("""
                ALTER TABLE "Commands"
                    ADD COLUMN IF NOT EXISTS "Attempts" integer NOT NULL DEFAULT 0,
                    ADD COLUMN IF NOT EXISTS "StartedAtUtc" timestamp with time zone NULL,
                    ADD COLUMN IF NOT EXISTS "NextAttemptAtUtc" timestamp with time zone NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NextAttemptAtUtc",
                table: "Commands");

            migrationBuilder.DropColumn(
                name: "Attempts",
                table: "Commands");

            migrationBuilder.DropColumn(
                name: "StartedAtUtc",
                table: "Commands");
        }
    }
}
