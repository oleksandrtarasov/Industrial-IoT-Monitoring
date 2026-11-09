namespace IndustrialIoT.Contracts.Devices;

public record DeviceSensorDto(
    Guid SensorId,
    string Type,
    string Unit,
    double? LowerBound,
    double? UpperBound,
    ushort? ModbusAddress,
    double? Scale,
    double? LastValue,
    DateTime? LastTimestampUtc
);

public record DeviceAlertDto(
    Guid AlertId,
    Guid DeviceId,
    Guid? SensorId,
    string Severity,
    string Message,
    DateTime RaisedAtUtc,
    DateTime? AcknowledgedAtUtc,
    DateTime? ClearedAtUtc
);

public record DeviceDetailsDto(
    Guid DeviceId,
    string Name,
    string Location,
    string Status,
    string? ModbusIpAddress,
    int? ModbusPort,
    byte? ModbusUnitId,
    IReadOnlyList<DeviceSensorDto> Sensors,
    IReadOnlyList<DeviceAlertDto> ActiveAlerts
);
