namespace IndustrialIoT.Domain.Entities;

public class Command
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DeviceId { get; set; }
    public string Name { get; set; } = default!;
    public string? Payload { get; set; }
    public DateTime RequestedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? ExecutedAtUtc { get; set; }
    public DateTime? StartedAtUtc { get; set; }
    public int Attempts { get; set; } = 0;
    public string Status { get; set; } = "Pending"; // Pending/Executing/Executed/Failed
    public string? Error { get; set; }
    public DateTime? NextAttemptAtUtc { get; set; }

}
