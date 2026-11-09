namespace IndustrialIoT.Contracts.Sensors;

public record UpdateSensorRequest(
    string Type,
    string Unit,
    double? LowerBound,
    double? UpperBound,
    ushort? ModbusAddress,
    double? Scale
);
