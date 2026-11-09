using IndustrialIoT.Application.Measurements;
using IndustrialIoT.Contracts.Common;
using IndustrialIoT.Contracts.Measurements;
using IndustrialIoT.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IndustrialIoT.Web.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MeasurementsController(IMeasurementService service, AppDbContext db) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<MeasurementDto>> Post(CreateMeasurementRequest request, CancellationToken ct)
    {
        try
        {
            var m = await service.RecordAsync(request, ct);
            var dto = new MeasurementDto(m.Id, m.SensorId, m.Value, m.TimestampUtc);
            return CreatedAtAction(nameof(GetBySensor), new { id = m.SensorId }, dto);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    [HttpGet("sensor/{id:guid}")]
    public async Task<ActionResult<PagedResult<MeasurementDto>>> GetBySensor(
        Guid id,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 100,
        CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize is < 1 or > 1000) pageSize = 100;

        var query = db.Measurements.AsNoTracking().Where(x => x.SensorId == id);
        if (from.HasValue) query = query.Where(x => x.TimestampUtc >= DateTime.SpecifyKind(from.Value, DateTimeKind.Utc));
        if (to.HasValue)   query = query.Where(x => x.TimestampUtc <= DateTime.SpecifyKind(to.Value, DateTimeKind.Utc));

        var total = await query.LongCountAsync(ct);
        var items = await query
            .OrderByDescending(x => x.TimestampUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new MeasurementDto(x.Id, x.SensorId, x.Value, x.TimestampUtc))
            .ToListAsync(ct);

        return Ok(new PagedResult<MeasurementDto>(items, page, pageSize, total));
    }
}
