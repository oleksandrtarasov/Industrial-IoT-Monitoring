using IndustrialIoT.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace IndustrialIoT.Infrastructure.Configurations;

public class SensorConfiguration : IEntityTypeConfiguration<Sensor>
{
    public void Configure(EntityTypeBuilder<Sensor> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Type).HasMaxLength(64).IsRequired();
        b.Property(x => x.Unit).HasMaxLength(32).IsRequired();

        b.HasIndex(x => new { x.DeviceId, x.Type });
    }
}
