namespace IndustrialIoT.Domain.Entities;

public class Device
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = default!;
    public string? Location { get; set; }
    public string Status { get; set; } = "Online"; // Online / Offline / Maintenance

    // --- MODBUS CONFIG ---
    public string? ModbusIpAddress { get; set; }   // np. "192.168.0.10"
    public int? ModbusPort { get; set; } = 502;    // standardowy port Modbus TCP
    public byte? ModbusUnitId { get; set; } = 1;   // adres slave / unit ID

    public ICollection<Sensor> Sensors { get; set; } = new List<Sensor>();
}
