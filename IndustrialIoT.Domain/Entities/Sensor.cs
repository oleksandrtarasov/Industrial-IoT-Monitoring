namespace IndustrialIoT.Domain.Entities;

public class Sensor
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DeviceId { get; set; }
    public string Type { get; set; } = default!;
    public string Unit { get; set; } = default!;
    public double? LowerBound { get; set; }
    public double? UpperBound { get; set; }

    // --- MODBUS CONFIG ---
    public ushort? ModbusAddress { get; set; }     // adres rejestru
    public double? Scale { get; set; }             // np. 0.1 jeśli 123 -> 12.3

    public Device Device { get; set; } = default!;
    public ICollection<Measurement> Measurements { get; set; } = new List<Measurement>();
}
