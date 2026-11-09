using IndustrialIoT.Contracts.Devices;
using IndustrialIoT.Domain.Entities;
using IndustrialIoT.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace IndustrialIoT.Web.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DevicesController(AppDbContext db) : ControllerBase
{
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<DeviceDto>> Get(Guid id, CancellationToken ct)
    {
        var d = await db.Devices.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (d is null) return NotFound();

        return Ok(new DeviceDto(
            d.Id,
            d.Name,
            d.Location ?? string.Empty,
            d.Status,
            d.ModbusIpAddress,
            d.ModbusPort,
            d.ModbusUnitId
        ));
    }

    [Authorize(Policy = "OperatorOnly")]
    [HttpPost]
    public async Task<ActionResult<DeviceDto>> Create(CreateDeviceRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest(new { error = "Name is required." });
        if (string.IsNullOrWhiteSpace(req.Location)) return BadRequest(new { error = "Location is required." });
        if (string.IsNullOrWhiteSpace(req.Status)) return BadRequest(new { error = "Status is required." });

        if (req.ModbusPort is not null and <= 0) return BadRequest(new { error = "ModbusPort must be > 0." });
        if (req.ModbusUnitId is not null and <= 0) return BadRequest(new { error = "ModbusUnitId must be > 0." });

        var d = new Device
        {
            Name = req.Name.Trim(),
            Location = req.Location.Trim(),
            Status = req.Status.Trim(),
            ModbusIpAddress = string.IsNullOrWhiteSpace(req.ModbusIpAddress) ? null : req.ModbusIpAddress.Trim(),
            ModbusPort = req.ModbusPort,
            ModbusUnitId = req.ModbusUnitId
        };

        db.Devices.Add(d);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(Get), new { id = d.Id }, new DeviceDto(
            d.Id,
            d.Name,
            d.Location ?? string.Empty,
            d.Status,
            d.ModbusIpAddress,
            d.ModbusPort,
            d.ModbusUnitId
        ));
    }

    [Authorize(Policy = "OperatorOnly")]
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateDeviceRequest req, CancellationToken ct)
    {
        var d = await db.Devices.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (d is null) return NotFound();

        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest(new { error = "Name is required." });
        if (string.IsNullOrWhiteSpace(req.Location)) return BadRequest(new { error = "Location is required." });
        if (string.IsNullOrWhiteSpace(req.Status)) return BadRequest(new { error = "Status is required." });

        if (req.ModbusPort is not null and <= 0) return BadRequest(new { error = "ModbusPort must be > 0." });
        if (req.ModbusUnitId is not null and <= 0) return BadRequest(new { error = "ModbusUnitId must be > 0." });

        d.Name = req.Name.Trim();
        d.Location = req.Location.Trim();
        d.Status = req.Status.Trim();
        d.ModbusIpAddress = string.IsNullOrWhiteSpace(req.ModbusIpAddress) ? null : req.ModbusIpAddress.Trim();
        d.ModbusPort = req.ModbusPort;
        d.ModbusUnitId = req.ModbusUnitId;

        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [Authorize(Policy = "OperatorOnly")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var d = await db.Devices.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (d is null) return NotFound();

        db.Devices.Remove(d);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    // -------------------------
    // Twoje istniejące endpointy
    // -------------------------

    [HttpGet("summary")]
    public async Task<ActionResult<IEnumerable<DeviceSummaryDto>>> GetSummary(CancellationToken ct)
    {
        var sensorsCount = await db.Sensors.AsNoTracking()
            .GroupBy(s => s.DeviceId)
            .Select(g => new { DeviceId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.DeviceId, x => x.Count, ct);

        var activeAlerts = await db.Alerts.AsNoTracking()
            .Where(a => a.ClearedAtUtc == null)
            .GroupBy(a => a.DeviceId)
            .Select(g => new { DeviceId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.DeviceId, x => x.Count, ct);

        var lastMeasurements = await db.Measurements.AsNoTracking()
            .Join(db.Sensors.AsNoTracking(),
                m => m.SensorId,
                s => s.Id,
                (m, s) => new { s.DeviceId, m.TimestampUtc })
            .GroupBy(x => x.DeviceId)
            .Select(g => new { DeviceId = g.Key, Last = (DateTime?)g.Max(x => x.TimestampUtc) })
            .ToDictionaryAsync(x => x.DeviceId, x => x.Last, ct);

        var devices = await db.Devices.AsNoTracking()
            .Select(d => new { d.Id, d.Name, d.Location, d.Status })
            .ToListAsync(ct);

        var result = devices.Select(d => new DeviceSummaryDto(
            d.Id,
            d.Name,
            d.Location ?? string.Empty,
            d.Status,
            lastMeasurements.TryGetValue(d.Id, out var lm) ? lm : null,
            activeAlerts.TryGetValue(d.Id, out var aa) ? aa : 0,
            sensorsCount.TryGetValue(d.Id, out var sc) ? sc : 0
        ));

        return Ok(result);
    }

    [HttpGet("{id:guid}/details")]
    public async Task<ActionResult<DeviceDetailsDto>> GetDetails(Guid id, CancellationToken ct)
    {
        var device = await db.Devices.AsNoTracking().FirstOrDefaultAsync(d => d.Id == id, ct);
        if (device is null) return NotFound();

        var sensors = await db.Sensors.AsNoTracking()
            .Where(s => s.DeviceId == id)
            .Select(s => new
            {
                s.Id,
                s.Type,
                s.Unit,
                s.LowerBound,
                s.UpperBound,
                s.ModbusAddress,
                s.Scale
            })
            .ToListAsync(ct);

        var sensorDtos = new List<DeviceSensorDto>();

        if (sensors.Count > 0)
        {
            var sensorIds = sensors.Select(s => s.Id).ToList();

            var lastLookup = await db.Measurements.AsNoTracking()
                .Where(m => sensorIds.Contains(m.SensorId))
                .GroupBy(m => m.SensorId)
                .Select(g => g
                    .OrderByDescending(x => x.TimestampUtc)
                    .Select(x => new { x.SensorId, x.Value, x.TimestampUtc })
                    .FirstOrDefault()!)
                .ToDictionaryAsync(x => x.SensorId, x => new { x.Value, x.TimestampUtc }, ct);

            sensorDtos = sensors.Select(s =>
            {
                lastLookup.TryGetValue(s.Id, out var last);
                return new DeviceSensorDto(
                    s.Id,
                    s.Type,
                    s.Unit,
                    s.LowerBound,
                    s.UpperBound,
                    s.ModbusAddress,
                    s.Scale,
                    last?.Value,
                    last?.TimestampUtc
                );
            }).ToList();
        }

        var activeAlerts = await db.Alerts.AsNoTracking()
            .Where(a => a.DeviceId == id && a.ClearedAtUtc == null)
            .OrderByDescending(a => a.RaisedAtUtc)
            .Take(100)
            .Select(a => new DeviceAlertDto(
                a.Id,
                a.DeviceId,
                a.SensorId,
                a.Severity,
                a.Message,
                a.RaisedAtUtc,
                a.AcknowledgedAtUtc,
                a.ClearedAtUtc
            ))
            .ToListAsync(ct);

        var dto = new DeviceDetailsDto(
            device.Id,
            device.Name,
            device.Location ?? string.Empty,
            device.Status,
            device.ModbusIpAddress,
            device.ModbusPort,
            device.ModbusUnitId,
            sensorDtos,
            activeAlerts
        );

        return Ok(dto);
    }
}
