using IndustrialIoT.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace IndustrialIoT.Infrastructure.Configurations;

public class DeviceConfiguration : IEntityTypeConfiguration<Device>
{
    public void Configure(EntityTypeBuilder<Device> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).HasMaxLength(200).IsRequired();
        b.Property(x => x.Status).HasMaxLength(32).IsRequired();
        b.HasMany(x => x.Sensors)
         .WithOne(x => x.Device)
         .HasForeignKey(x => x.DeviceId)
         .OnDelete(DeleteBehavior.Cascade);
    }
}
