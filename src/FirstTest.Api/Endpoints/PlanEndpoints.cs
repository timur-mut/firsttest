using FirstTest.Api.Data;
using FirstTest.Api.Models;

namespace FirstTest.Api.Endpoints;

public static class PlanEndpoints
{
    public static IEndpointRouteBuilder MapPlanEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/plans").WithTags("Plans");

        // GET /api/plans — list saved plans (without the scene payload).
        group.MapGet("/", async (IPlanRepository repo) =>
            Results.Ok(await repo.GetAllAsync()));

        // GET /api/plans/{id} — full plan including the scene.
        group.MapGet("/{id:int}", async (int id, IPlanRepository repo) =>
            await repo.GetByIdAsync(id) is { } plan
                ? Results.Ok(plan)
                : Results.NotFound());

        // POST /api/plans — create a new plan.
        group.MapPost("/", async (CreatePlanRequest request, IPlanRepository repo) =>
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                return Results.BadRequest("Name is required.");
            if (string.IsNullOrWhiteSpace(request.Scene))
                return Results.BadRequest("Scene is required.");

            var created = await repo.CreateAsync(request);
            return Results.Created($"/api/plans/{created.Id}", created);
        });

        // PUT /api/plans/{id} — update an existing plan.
        group.MapPut("/{id:int}", async (int id, UpdatePlanRequest request, IPlanRepository repo) =>
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                return Results.BadRequest("Name is required.");
            if (string.IsNullOrWhiteSpace(request.Scene))
                return Results.BadRequest("Scene is required.");

            return await repo.UpdateAsync(id, request) is { } updated
                ? Results.Ok(updated)
                : Results.NotFound();
        });

        // DELETE /api/plans/{id}
        group.MapDelete("/{id:int}", async (int id, IPlanRepository repo) =>
            await repo.DeleteAsync(id)
                ? Results.NoContent()
                : Results.NotFound());

        return app;
    }
}
