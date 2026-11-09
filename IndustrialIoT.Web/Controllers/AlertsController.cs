using IndustrialIoT.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IndustrialIoT.Web.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AlertsController(AppDbContext db) : ControllerBase
{
    // GET /api/alerts?severity=&acknowledged=&since=&take=100
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] string? severity,
        [FromQuery] bool? acknowledged,
        [FromQuery] DateTime? since,
        [FromQuery] int take = 100,
        CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 1000);

        var q = db.Alerts.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(severity))
            q = q.Where(a => a.Severity == severity);

        if (acknowledged.HasValue)
            q = acknowledged.Value
                ? q.Where(a => a.AcknowledgedAtUtc != null)
                : q.Where(a => a.AcknowledgedAtUtc == null);

        if (since.HasValue)
            q = q.Where(a => a.RaisedAtUtc >= DateTime.SpecifyKind(since.Value, DateTimeKind.Utc));

        var items = await q.OrderByDescending(a => a.RaisedAtUtc)
            .Take(take)
            .Select(a => new {
                a.Id, a.DeviceId, a.SensorId, a.Severity, a.Message,
                a.RaisedAtUtc, a.AcknowledgedAtUtc, a.ClearedAtUtc
            })
            .ToListAsync(ct);

        return Ok(items);
    }

    // POST /api/alerts/{id}/ack
    [Authorize(Policy = "OperatorOnly")]
    [HttpPost("{id:guid}/ack")]
    public async Task<IActionResult> Ack(Guid id, CancellationToken ct)
    {
        var alert = await db.Alerts.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (alert is null) return NotFound();

        if (alert.ClearedAtUtc is not null)
            return BadRequest(new { error = "Alert is already cleared." });

        alert.AcknowledgedAtUtc ??= DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // POST /api/alerts/{id}/clear
    [Authorize(Policy = "OperatorOnly")]
    [HttpPost("{id:guid}/clear")]
    public async Task<IActionResult> Clear(Guid id, CancellationToken ct)
    {
        var alert = await db.Alerts.FirstOrDefaultAsync(a => a.Id == id, ct);
        if (alert is null) return NotFound();

        if (alert.ClearedAtUtc is null)
            alert.ClearedAtUtc = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
