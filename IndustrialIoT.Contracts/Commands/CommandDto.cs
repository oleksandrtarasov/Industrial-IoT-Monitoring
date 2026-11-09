namespace IndustrialIoT.Contracts.Commands;
public record CommandDto(Guid Id, Guid DeviceId, string Name, string? Payload, string Status, DateTime RequestedAtUtc, DateTime? ExecutedAtUtc, string? Error);
