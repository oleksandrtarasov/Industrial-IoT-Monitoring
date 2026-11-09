namespace IndustrialIoT.Infrastructure.Commands;

public sealed record ModbusWriteSingleRegisterPayload(
    ushort RegisterAddress,
    ushort Value
);
