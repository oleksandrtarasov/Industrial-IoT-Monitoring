namespace IndustrialIoT.Contracts.Commands;

public record CommandListQuery(
    string? Status,
    Guid? DeviceId,
    DateTime? FromUtc,
    DateTime? ToUtc,
    int Page = 1,
    int PageSize = 50
);
