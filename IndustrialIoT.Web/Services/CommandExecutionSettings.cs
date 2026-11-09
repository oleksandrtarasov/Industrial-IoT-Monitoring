namespace IndustrialIoT.Web.Services;

public class CommandExecutionSettings
{
    public int PollIntervalSeconds { get; set; } = 1;
    public int BatchSize { get; set; } = 10;
    public int MaxAttempts { get; set; } = 3;
    public int BaseBackoffSeconds { get; set; } = 5;
    public int ExecutionTimeoutSeconds { get; set; } = 30;
}
