namespace IndustrialIoT.Domain.Entities;

public class Measurement
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SensorId { get; set; }
    public double Value { get; set; }
    public DateTime TimestampUtc { get; set; }

    public Sensor Sensor { get; set; } = default!;
}
