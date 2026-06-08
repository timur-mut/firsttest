using Dapper;
using FirstTest.Api.Models;

namespace FirstTest.Api.Data;

public sealed class PlanRepository : IPlanRepository
{
    private readonly IDbConnectionFactory _factory;

    public PlanRepository(IDbConnectionFactory factory) => _factory = factory;

    public async Task<IEnumerable<PlanSummary>> GetAllAsync()
    {
        using var conn = _factory.CreateConnection();
        const string sql = """
            SELECT id, name, created_at AS CreatedAt, updated_at AS UpdatedAt
            FROM plans
            ORDER BY updated_at DESC, id DESC;
            """;
        return await conn.QueryAsync<PlanSummary>(sql);
    }

    public async Task<Plan?> GetByIdAsync(int id)
    {
        using var conn = _factory.CreateConnection();
        const string sql = """
            SELECT id, name, scene::text AS Scene, reference_image::text AS ReferenceImage,
                   created_at AS CreatedAt, updated_at AS UpdatedAt
            FROM plans
            WHERE id = @id;
            """;
        return await conn.QuerySingleOrDefaultAsync<Plan>(sql, new { id });
    }

    public async Task<Plan> CreateAsync(CreatePlanRequest request)
    {
        using var conn = _factory.CreateConnection();
        // Scene + reference image arrive as JSON text; cast to jsonb for storage
        // (a null reference image stays NULL).
        const string sql = """
            INSERT INTO plans (name, scene, reference_image)
            VALUES (@Name, @Scene::jsonb, @ReferenceImage::jsonb)
            RETURNING id, name, scene::text AS Scene, reference_image::text AS ReferenceImage,
                      created_at AS CreatedAt, updated_at AS UpdatedAt;
            """;
        return await conn.QuerySingleAsync<Plan>(sql, new { request.Name, request.Scene, request.ReferenceImage });
    }

    public async Task<Plan?> UpdateAsync(int id, UpdatePlanRequest request)
    {
        using var conn = _factory.CreateConnection();
        const string sql = """
            UPDATE plans
            SET name = @Name, scene = @Scene::jsonb, reference_image = @ReferenceImage::jsonb, updated_at = NOW()
            WHERE id = @id
            RETURNING id, name, scene::text AS Scene, reference_image::text AS ReferenceImage,
                      created_at AS CreatedAt, updated_at AS UpdatedAt;
            """;
        return await conn.QuerySingleOrDefaultAsync<Plan>(sql, new { id, request.Name, request.Scene, request.ReferenceImage });
    }

    public async Task<bool> DeleteAsync(int id)
    {
        using var conn = _factory.CreateConnection();
        const string sql = "DELETE FROM plans WHERE id = @id;";
        var rows = await conn.ExecuteAsync(sql, new { id });
        return rows > 0;
    }
}
