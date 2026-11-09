using IndustrialIoT.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace IndustrialIoT.Infrastructure.Seeding;

public static class DataSeeder
{
    public static readonly Guid SeedDeviceId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    public static readonly Guid SeedSensorId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    public static async Task SeedAsync(AppDbContext db, CancellationToken ct = default)
    {
        // jeśli baza świeża – brak Devices -> seed
        var exists = await db.Devices.AnyAsync(ct);
        if (exists) return;

        var device = new Device
        {
            Id = SeedDeviceId,
            Name = "Boiler-01",
            Location = "Plant A",
            Status = "Online"
        };

        var sensor = new Sensor
        {
            Id = SeedSensorId,
            DeviceId = device.Id,
            Type = "Temp",
            Unit = "°C",
            LowerBound = 10,   // zakres roboczy 10–90 °C
            UpperBound = 90
        };

        db.Devices.Add(device);
        db.Sensors.Add(sensor);

        await db.SaveChangesAsync(ct);
    }
}
