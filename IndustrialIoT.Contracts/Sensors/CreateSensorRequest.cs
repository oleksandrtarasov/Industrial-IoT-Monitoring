namespace IndustrialIoT.Contracts.Sensors;

public record CreateSensorRequest(
    Guid DeviceId,
    string Type,
    string Unit,
    double? LowerBound,
    double? UpperBound,
    ushort? ModbusAddress,
    double? Scale
);
