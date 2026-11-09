using IndustrialIoT.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace IndustrialIoT.Infrastructure.Configurations;

public class MeasurementConfiguration : IEntityTypeConfiguration<Measurement>
{
    public void Configure(EntityTypeBuilder<Measurement> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.TimestampUtc).IsRequired();

        b.HasIndex(x => new { x.SensorId, x.TimestampUtc });
    }
}
