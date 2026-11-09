namespace IndustrialIoT.Contracts.Measurements;

public record MeasurementDto(
    Guid Id,
    Guid SensorId,
    double Value,
    DateTime TimestampUtc
);
