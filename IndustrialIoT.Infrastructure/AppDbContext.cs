using IndustrialIoT.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace IndustrialIoT.Infrastructure;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Device> Devices => Set<Device>();
    public DbSet<Sensor> Sensors => Set<Sensor>();
    public DbSet<Measurement> Measurements => Set<Measurement>();
    public DbSet<Alert> Alerts => Set<Alert>();
    public DbSet<Command> Commands => Set<Command>();


    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
