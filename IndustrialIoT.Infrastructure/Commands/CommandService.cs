using IndustrialIoT.Application.Commands;
using IndustrialIoT.Contracts.Commands;
using IndustrialIoT.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace IndustrialIoT.Infrastructure.Commands;

public class CommandService(AppDbContext db) : ICommandService
{
    public async Task<Command> EnqueueAsync(CreateCommandRequest req, CancellationToken ct = default)
    {
        var deviceExists = await db.Devices.AnyAsync(d => d.Id == req.DeviceId, ct);
        if (!deviceExists) throw new InvalidOperationException("Device not found.");

        if (string.IsNullOrWhiteSpace(req.Name))
            throw new InvalidOperationException("Command name is required.");

        var cmd = new Command
        {
            DeviceId = req.DeviceId,
            Name = req.Name.Trim(),
            Payload = req.Payload,
            Status = "Pending"
        };

        await db.Commands.AddAsync(cmd, ct);
        await db.SaveChangesAsync(ct);

        return cmd;
    }
}
