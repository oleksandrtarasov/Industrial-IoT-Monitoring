using IndustrialIoT.Contracts.Commands;
using IndustrialIoT.Domain.Entities;

namespace IndustrialIoT.Application.Commands;
public interface ICommandService
{
    Task<Command> EnqueueAsync(CreateCommandRequest req, CancellationToken ct = default);
}
