using IndustrialIoT.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace IndustrialIoT.Infrastructure.Configurations;

public class AlertConfiguration : IEntityTypeConfiguration<Alert>
{
    public void Configure(EntityTypeBuilder<Alert> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Severity).HasMaxLength(32).IsRequired();
        b.Property(x => x.Message).HasMaxLength(512).IsRequired();

        b.HasIndex(x => new { x.DeviceId, x.RaisedAtUtc });
        b.HasIndex(x => x.SensorId);
    }
}
