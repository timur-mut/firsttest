using FirstTest.Api.Models;

namespace FirstTest.Api.Data;

public interface IPlanRepository
{
    Task<IEnumerable<PlanSummary>> GetAllAsync();
    Task<Plan?> GetByIdAsync(int id);
    Task<Plan> CreateAsync(CreatePlanRequest request);
    Task<Plan?> UpdateAsync(int id, UpdatePlanRequest request);
    Task<bool> DeleteAsync(int id);
}
