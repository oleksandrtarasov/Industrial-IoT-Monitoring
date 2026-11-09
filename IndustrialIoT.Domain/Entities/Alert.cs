namespace IndustrialIoT.Domain.Entities;

public class Alert
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DeviceId { get; set; }
    public Guid? SensorId { get; set; }

    public string Severity { get; set; } = "Warning"; // Info/Warning/Critical
    public string Message { get; set; } = default!;
    public DateTime RaisedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? AcknowledgedAtUtc { get; set; }
    public DateTime? ClearedAtUtc { get; set; }
}
