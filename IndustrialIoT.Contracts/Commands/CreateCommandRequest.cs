namespace IndustrialIoT.Contracts.Commands;
public record CreateCommandRequest(Guid DeviceId, string Name, string? Payload);
