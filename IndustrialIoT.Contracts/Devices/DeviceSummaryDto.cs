namespace IndustrialIoT.Contracts.Devices;

public record DeviceSummaryDto(
    Guid DeviceId,
    string Name,
    string Location,
    string Status,
    DateTime? LastMeasurementUtc,
    int ActiveAlerts,          // ClearedAtUtc == null
    int SensorsCount
);
