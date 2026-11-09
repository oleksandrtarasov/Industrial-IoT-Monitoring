namespace IndustrialIoT.Contracts.Sensors;

public record SensorDto(
    Guid Id,
    Guid DeviceId,
    string Type,
    string Unit,
    double? LowerBound,
    double? UpperBound,
    ushort? ModbusAddress,
    double? Scale
);
