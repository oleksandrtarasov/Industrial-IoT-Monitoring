using IndustrialIoT.Contracts.Measurements;
using IndustrialIoT.Domain.Entities;

namespace IndustrialIoT.Application.Measurements;

public interface IMeasurementService
{
    Task<Measurement> RecordAsync(CreateMeasurementRequest request, CancellationToken ct = default);
}
