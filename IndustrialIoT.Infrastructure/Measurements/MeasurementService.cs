using IndustrialIoT.Application.Measurements;
using IndustrialIoT.Contracts.Measurements;
using IndustrialIoT.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace IndustrialIoT.Infrastructure.Measurements;

public class MeasurementService(AppDbContext db) : IMeasurementService
{
    public async Task<Measurement> RecordAsync(CreateMeasurementRequest request, CancellationToken ct = default)
    {
        var sensor = await db.Sensors.Include(s => s.Device)
            .FirstOrDefaultAsync(s => s.Id == request.SensorId, ct)
            ?? throw new InvalidOperationException("Sensor not found.");

        var timestamp = request.TimestampUtc ?? DateTime.UtcNow;

        var m = new Measurement
        {
            SensorId = sensor.Id,
            Value = request.Value,
            TimestampUtc = DateTime.SpecifyKind(timestamp, DateTimeKind.Utc)
        };
        await db.Measurements.AddAsync(m, ct);

        var outOfRange =
            (sensor.LowerBound.HasValue && request.Value < sensor.LowerBound.Value) ||
            (sensor.UpperBound.HasValue && request.Value > sensor.UpperBound.Value);

        if (outOfRange)
        {
            var severity = "Warning";
            if (sensor.UpperBound.HasValue && request.Value > sensor.UpperBound.Value * 1.2) severity = "Critical";
            if (sensor.LowerBound.HasValue && request.Value < sensor.LowerBound.Value * 0.8) severity = "Critical";

            var alert = new Alert
            {
                DeviceId = sensor.DeviceId,
                SensorId = sensor.Id,
                Severity = severity,
                Message = $"Value {request.Value} {sensor.Unit} outside [{sensor.LowerBound ?? double.NaN}; {sensor.UpperBound ?? double.NaN}]",
                RaisedAtUtc = DateTime.UtcNow
            };
            await db.Alerts.AddAsync(alert, ct);
        }

        await db.SaveChangesAsync(ct);
        return m;
    }
}
