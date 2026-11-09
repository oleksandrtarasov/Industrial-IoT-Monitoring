namespace IndustrialIoT.Contracts.Devices;
public record CreateDeviceRequest(
    string Name,
    string Location,
    string Status,
    string? ModbusIpAddress,
    int? ModbusPort,
    byte? ModbusUnitId
);
