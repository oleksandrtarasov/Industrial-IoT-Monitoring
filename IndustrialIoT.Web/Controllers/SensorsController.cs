using IndustrialIoT.Contracts.Sensors;
using IndustrialIoT.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IndustrialIoT.Web.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SensorsController(AppDbContext db) : ControllerBase
{

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SensorDto>>> GetAll(CancellationToken ct)
    {
        var items = await db.Sensors
            .AsNoTracking()
            .Select(s => new SensorDto(s.Id, s.DeviceId, s.Type, s.Unit, s.LowerBound, s.UpperBound, s.ModbusAddress, s.Scale))
            .ToListAsync(ct);

        return Ok(items);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<SensorDto>> Get(Guid id, CancellationToken ct)
    {
        var s = await db.Sensors.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (s is null) return NotFound();

        return Ok(new SensorDto(s.Id, s.DeviceId, s.Type, s.Unit, s.LowerBound, s.UpperBound, s.ModbusAddress, s.Scale));
    }

    [Authorize(Policy = "OperatorOnly")]
    [HttpPost]
    public async Task<ActionResult<SensorDto>> Create(CreateSensorRequest req, CancellationToken ct)
    {
        var exists = await db.Devices.AnyAsync(d => d.Id == req.DeviceId, ct);
        if (!exists) return NotFound(new { error = "Device does not exist." });

        var s = new Domain.Entities.Sensor
        {
            DeviceId = req.DeviceId,
            Type = req.Type,
            Unit = req.Unit,
            LowerBound = req.LowerBound,
            UpperBound = req.UpperBound,
            ModbusAddress = req.ModbusAddress,
            Scale = req.Scale
        };

        if (req.Scale is <= 0)
            return BadRequest(new { error = "Scale must be > 0." });

        db.Sensors.Add(s);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(Get), new { id = s.Id },
            new SensorDto(s.Id, s.DeviceId, s.Type, s.Unit, s.LowerBound, s.UpperBound, s.ModbusAddress, s.Scale));
    }

    [Authorize(Policy = "OperatorOnly")]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateSensorRequest req, CancellationToken ct)
    {
        var s = await db.Sensors.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (s is null) return NotFound();

        s.Type = req.Type;
        s.Unit = req.Unit;
        s.LowerBound = req.LowerBound;
        s.UpperBound = req.UpperBound;
        s.ModbusAddress = req.ModbusAddress;
        s.Scale = req.Scale;

        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [Authorize(Policy = "OperatorOnly")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var s = await db.Sensors.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (s is null) return NotFound();

        db.Sensors.Remove(s);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
