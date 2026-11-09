namespace IndustrialIoT.Contracts.Devices;

public record DeviceDto(
    Guid Id,
    string Name,
    string Location,
    string Status,
    string? ModbusIpAddress,
    int? ModbusPort,
    byte? ModbusUnitId
);
