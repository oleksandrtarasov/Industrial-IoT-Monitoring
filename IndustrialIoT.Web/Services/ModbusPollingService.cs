using System.Net.Sockets;
using IndustrialIoT.Application.Measurements;
using IndustrialIoT.Contracts.Measurements;
using IndustrialIoT.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using NModbus;

namespace IndustrialIoT.Web.Services;

public class ModbusSettings
{
    public int PollIntervalSeconds { get; set; } = 5;
    public int ReadTimeoutMs { get; set; } = 2000;
    public int WriteTimeoutMs { get; set; } = 2000;
}

public sealed class ModbusPollingService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ModbusPollingService> _logger;
    private readonly TimeSpan _pollInterval;
    private readonly ModbusSettings _settings;

    public ModbusPollingService(
        IServiceScopeFactory scopeFactory,
        ILogger<ModbusPollingService> logger,
        IOptions<ModbusSettings> options)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _settings = options.Value;
        _pollInterval = TimeSpan.FromSeconds(_settings.PollIntervalSeconds);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Modbus polling service started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();

                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var measurementService = scope.ServiceProvider.GetRequiredService<IMeasurementService>();

                var sensors = await db.Sensors
                    .Include(s => s.Device)
                    .Where(s =>
                        s.Device.ModbusIpAddress != null &&
                        s.Device.ModbusPort != null &&
                        s.Device.ModbusUnitId != null &&
                        s.ModbusAddress != null)
                    .ToListAsync(stoppingToken);

                var groups = sensors.GroupBy(s => new
                {
                    s.Device.ModbusIpAddress,
                    s.Device.ModbusPort,
                    s.Device.ModbusUnitId
                });

                foreach (var group in groups)
                {
                    var ip = group.Key.ModbusIpAddress!;
                    var port = group.Key.ModbusPort!.Value;
                    var unitId = group.Key.ModbusUnitId!.Value;

                    try
                    {
                        using var client = new TcpClient();
                        await client.ConnectAsync(ip, port, stoppingToken);

                        var factory = new ModbusFactory();

                        var master = factory.CreateMaster(client);

                        master.Transport.ReadTimeout = _settings.ReadTimeoutMs;
                        master.Transport.WriteTimeout = _settings.WriteTimeoutMs;

                        foreach (var sensor in group)
                        {
                            var address = sensor.ModbusAddress!.Value;

                            var registers = master.ReadHoldingRegisters(unitId, address, 1);
                            var raw = registers[0];

                            var value = sensor.Scale.HasValue
                                ? raw * sensor.Scale.Value
                                : raw;

                            _logger.LogInformation(
                                "Modbus read: Device={Ip}:{Port} UnitId={UnitId} Sensor={SensorId} Addr={Addr} Raw={Raw} Value={Value}",
                                ip, port, unitId, sensor.Id, address, raw, value);

                            await measurementService.RecordAsync(
                                new CreateMeasurementRequest(sensor.Id, value, DateTime.UtcNow),
                                stoppingToken);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex,
                            "Błąd podczas odpytywania urządzenia Modbus {Ip}:{Port} (UnitId={UnitId})",
                            ip, port, unitId);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Błąd główny w ModbusPollingService");
            }

            await Task.Delay(_pollInterval, stoppingToken);
        }

        _logger.LogInformation("Modbus polling service stopped");
    }
}
