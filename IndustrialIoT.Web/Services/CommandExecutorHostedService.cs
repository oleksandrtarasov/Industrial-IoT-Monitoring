using System.Net.Sockets;
using System.Text.Json;
using IndustrialIoT.Infrastructure;
using IndustrialIoT.Infrastructure.Commands;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using NModbus;

namespace IndustrialIoT.Web.Services;

public sealed class CommandExecutorHostedService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<CommandExecutorHostedService> _logger;
    private readonly TimeSpan _interval;
    private readonly CommandExecutionSettings _settings;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public CommandExecutorHostedService(
        IServiceScopeFactory scopeFactory,
        ILogger<CommandExecutorHostedService> logger,
        IOptions<CommandExecutionSettings> options)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _settings = options.Value;
        _interval = TimeSpan.FromSeconds(_settings.PollIntervalSeconds);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("CommandExecutorHostedService started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                var now = DateTime.UtcNow;
                await RecoverStaleCommandsAsync(db, now, stoppingToken);

                // 1) Pobierz Pending (FIFO) + retry gating
                var pending = await db.Commands
                    .Where(c =>
                        c.Status == "Pending" &&
                        c.Attempts < _settings.MaxAttempts &&
                        (c.NextAttemptAtUtc == null || c.NextAttemptAtUtc <= now))
                    .OrderBy(c => c.RequestedAtUtc)
                    .Take(_settings.BatchSize)
                    .ToListAsync(stoppingToken);

                if (pending.Count == 0)
                {
                    await Task.Delay(_interval, stoppingToken);
                    continue;
                }

                foreach (var cmd in pending)
                {
                    if (stoppingToken.IsCancellationRequested) break;

                    // 2) Przejmij komendę (MVP)
                    //    Uwaga: to nie jest atomowy claim, ale dla 1 instancji worker jest OK.
                    cmd.Status = "Executing";
                    cmd.Error = null;
                    cmd.StartedAtUtc = DateTime.UtcNow;
                    cmd.Attempts += 1;

                    // żeby nie “mieliło” w razie crasha w połowie
                    cmd.NextAttemptAtUtc = null;

                    await db.SaveChangesAsync(stoppingToken);

                    try
                    {
                        await ExecuteCommandAsync(db, cmd.Id, stoppingToken);

                        cmd.Status = "Executed";
                        cmd.ExecutedAtUtc = DateTime.UtcNow;
                        cmd.Error = null;
                        cmd.NextAttemptAtUtc = null;

                        await db.SaveChangesAsync(stoppingToken);
                    }
                    catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                    {
                        throw;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Command failed: {CommandId} attempt={Attempt}/{Max}",
                            cmd.Id, cmd.Attempts, _settings.MaxAttempts);

                        cmd.Error = ex.Message;

                        if (cmd.Attempts >= _settings.MaxAttempts)
                        {
                            // koniec prób
                            cmd.Status = "Failed";
                            cmd.ExecutedAtUtc = DateTime.UtcNow;
                            cmd.NextAttemptAtUtc = null;
                        }
                        else
                        {
                            // retry później (backoff liniowy: 5s, 10s, 15s...)
                            cmd.Status = "Pending";
                            var delay = TimeSpan.FromSeconds(_settings.BaseBackoffSeconds * cmd.Attempts);
                            cmd.NextAttemptAtUtc = DateTime.UtcNow.Add(delay);

                            // ExecutedAtUtc zostaw null, bo jeszcze “nie zakończone”
                            cmd.ExecutedAtUtc = null;
                        }

                        await db.SaveChangesAsync(stoppingToken);
                    }
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Worker main loop error");
            }

            await Task.Delay(_interval, stoppingToken);
        }

        _logger.LogInformation("CommandExecutorHostedService stopped");
    }

    private async Task RecoverStaleCommandsAsync(AppDbContext db, DateTime now, CancellationToken ct)
    {
        var staleBefore = now.AddSeconds(-_settings.ExecutionTimeoutSeconds);
        var staleCommands = await db.Commands
            .Where(c =>
                c.Status == "Executing" &&
                c.StartedAtUtc != null &&
                c.StartedAtUtc <= staleBefore)
            .ToListAsync(ct);

        if (staleCommands.Count == 0) return;

        foreach (var command in staleCommands)
        {
            command.Error = $"Execution timed out after {_settings.ExecutionTimeoutSeconds} seconds.";
            command.StartedAtUtc = null;

            if (command.Attempts >= _settings.MaxAttempts)
            {
                command.Status = "Failed";
                command.ExecutedAtUtc = now;
                command.NextAttemptAtUtc = null;
            }
            else
            {
                command.Status = "Pending";
                command.ExecutedAtUtc = null;
                command.NextAttemptAtUtc = now.AddSeconds(
                    _settings.BaseBackoffSeconds * Math.Max(1, command.Attempts));
            }
        }

        await db.SaveChangesAsync(ct);
        _logger.LogWarning("Recovered {Count} stale executing commands", staleCommands.Count);
    }

    private static async Task ExecuteCommandAsync(AppDbContext db, Guid commandId, CancellationToken ct)
    {
        var cmd = await db.Commands.FirstOrDefaultAsync(c => c.Id == commandId, ct);
        if (cmd is null) return;

        var device = await db.Devices.AsNoTracking().FirstOrDefaultAsync(d => d.Id == cmd.DeviceId, ct);
        if (device is null) throw new InvalidOperationException("Device not found.");

        if (device.ModbusIpAddress is null || device.ModbusPort is null || device.ModbusUnitId is null)
            throw new InvalidOperationException("Device has no Modbus configuration (ip/port/unitId).");

        if (cmd.Name == "Modbus.WriteSingleRegister")
        {
            if (string.IsNullOrWhiteSpace(cmd.Payload))
                throw new InvalidOperationException("Payload is required for Modbus.WriteSingleRegister.");

            var payload = JsonSerializer.Deserialize<ModbusWriteSingleRegisterPayload>(cmd.Payload!, JsonOptions);
            if (payload is null) throw new InvalidOperationException("Invalid payload JSON.");

            using var tcp = new TcpClient();
            await tcp.ConnectAsync(device.ModbusIpAddress, device.ModbusPort.Value, ct);

            var factory = new ModbusFactory();
            var master = factory.CreateMaster(tcp);
            master.Transport.ReadTimeout = 2000;
            master.Transport.WriteTimeout = 2000;

            master.WriteSingleRegister(device.ModbusUnitId.Value, payload.RegisterAddress, payload.Value);
            return;
        }

        throw new InvalidOperationException($"Unknown command name: {cmd.Name}");
    }
}
