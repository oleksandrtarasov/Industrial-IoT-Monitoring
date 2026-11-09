namespace IndustrialIoT.Contracts.Devices;
public record UpdateDeviceRequest(
    Guid Id,
    string Name,
    string Location,
    string Status,
    string? ModbusIpAddress,
    int? ModbusPort,
    byte? ModbusUnitId);
