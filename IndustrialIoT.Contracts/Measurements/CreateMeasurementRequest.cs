namespace IndustrialIoT.Contracts.Measurements;

public record CreateMeasurementRequest(
    Guid SensorId,
    double Value,
    DateTime? TimestampUtc
);
