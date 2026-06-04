using FirstTest.Api.Data;
using FirstTest.Api.Models;

namespace FirstTest.Api.Endpoints;

public static class TodoEndpoints
{
    public static IEndpointRouteBuilder MapTodoEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/todos").WithTags("Todos");

        group.MapGet("/", async (ITodoRepository repo) =>
            Results.Ok(await repo.GetAllAsync()));

        group.MapGet("/{id:int}", async (int id, ITodoRepository repo) =>
            await repo.GetByIdAsync(id) is { } todo
                ? Results.Ok(todo)
                : Results.NotFound());

        group.MapPost("/", async (CreateTodoRequest request, ITodoRepository repo) =>
        {
            if (string.IsNullOrWhiteSpace(request.Title))
                return Results.BadRequest("Title is required.");

            var created = await repo.CreateAsync(request);
            return Results.Created($"/api/todos/{created.Id}", created);
        });

        group.MapPut("/reorder", async (ReorderRequest request, ITodoRepository repo) =>
        {
            if (!TodoStatus.IsValid(request.Status))
                return Results.BadRequest($"Status must be one of: {string.Join(", ", TodoStatus.All)}.");
            if (request.Ids is null || request.Ids.Count == 0)
                return Results.BadRequest("At least one id is required.");

            await repo.ReorderAsync(request.Status, request.Ids);
            return Results.Ok(await repo.GetAllAsync());
        });

        group.MapPut("/{id:int}", async (int id, UpdateTodoRequest request, ITodoRepository repo) =>
        {
            if (!TodoStatus.IsValid(request.Status))
                return Results.BadRequest($"Status must be one of: {string.Join(", ", TodoStatus.All)}.");

            return await repo.UpdateAsync(id, request) is { } updated
                ? Results.Ok(updated)
                : Results.NotFound();
        });

        group.MapDelete("/{id:int}", async (int id, ITodoRepository repo) =>
            await repo.DeleteAsync(id)
                ? Results.NoContent()
                : Results.NotFound());

        return app;
    }
}
