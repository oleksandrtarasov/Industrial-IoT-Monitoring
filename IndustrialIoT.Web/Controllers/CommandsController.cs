using IndustrialIoT.Application.Commands;
using IndustrialIoT.Contracts.Commands;
using IndustrialIoT.Contracts.Common;
using IndustrialIoT.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IndustrialIoT.Web.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CommandsController(ICommandService service, AppDbContext db) : ControllerBase
{
    // POST /api/Commands
    [Authorize(Policy = "OperatorOnly")]
    [HttpPost]
    public async Task<ActionResult<CommandDto>> Post(CreateCommandRequest req, CancellationToken ct)
    {
        try
        {
            var c = await service.EnqueueAsync(req, ct);
            return CreatedAtAction(nameof(GetById), new { id = c.Id }, Map(c));
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    // GET /api/Commands/{id}
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CommandDto>> GetById(Guid id, CancellationToken ct)
    {
        var c = await db.Commands.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (c is null) return NotFound();
        return Ok(Map(c));
    }

    // GET /api/Commands/device/{id}
    [HttpGet("device/{id:guid}")]
    public async Task<ActionResult<IEnumerable<CommandDto>>> GetByDevice(Guid id, CancellationToken ct)
    {
        var cmds = await db.Commands.AsNoTracking()
            .Where(c => c.DeviceId == id)
            .OrderByDescending(c => c.RequestedAtUtc)
            .Take(200)
            .Select(c => new CommandDto(
                c.Id, c.DeviceId, c.Name, c.Payload, c.Status,
                c.RequestedAtUtc, c.ExecutedAtUtc,
                c.Error
            ))
            .ToListAsync(ct);

        return Ok(cmds);
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<CommandDto>>> Get(
        [FromQuery] CommandListQuery query,
        CancellationToken ct = default)
    {
        var page = query.Page < 1 ? 1 : query.Page;
        var pageSize = query.PageSize is < 1 or > 200 ? 50 : query.PageSize;

        var q = db.Commands.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(query.Status))
            q = q.Where(c => c.Status == query.Status);

        if (query.DeviceId.HasValue)
            q = q.Where(c => c.DeviceId == query.DeviceId.Value);

        if (query.FromUtc.HasValue)
            q = q.Where(c => c.RequestedAtUtc >= DateTime.SpecifyKind(query.FromUtc.Value, DateTimeKind.Utc));

        if (query.ToUtc.HasValue)
            q = q.Where(c => c.RequestedAtUtc <= DateTime.SpecifyKind(query.ToUtc.Value, DateTimeKind.Utc));

        var total = await q.LongCountAsync(ct);

        var items = await q
            .OrderByDescending(c => c.RequestedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new CommandDto(
                c.Id, c.DeviceId, c.Name, c.Payload, c.Status,
                c.RequestedAtUtc, c.ExecutedAtUtc,
                c.Error
            ))
            .ToListAsync(ct);

        return Ok(new PagedResult<CommandDto>(items, page, pageSize, total));
    }

    [Authorize(Policy = "OperatorOnly")]
    [HttpPost("{id:guid}/retry")]
    public async Task<IActionResult> Retry(Guid id, CancellationToken ct)
    {
        var cmd = await db.Commands.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (cmd is null) return NotFound();

        if (cmd.Status != "Failed")
            return BadRequest(new { error = "Only Failed commands can be retried." });

        cmd.Status = "Pending";
        cmd.Error = null;
        cmd.ExecutedAtUtc = null;
        cmd.StartedAtUtc = null;
        cmd.Attempts = 0;
        cmd.NextAttemptAtUtc = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    private static CommandDto Map(Domain.Entities.Command c) =>
        new(
            c.Id, c.DeviceId, c.Name, c.Payload, c.Status,
            c.RequestedAtUtc, c.ExecutedAtUtc,
            c.Error
        );
}
