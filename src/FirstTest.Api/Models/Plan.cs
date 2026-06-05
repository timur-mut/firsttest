namespace FirstTest.Api.Models;

/// <summary>
/// A saved floor plan. The scene is stored as raw JSON (the client's serialized
/// scene envelope); the API treats it as an opaque string backed by a jsonb column.
/// </summary>
public record Plan
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Scene { get; init; } = "{}";
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}

/// <summary>Lightweight list item — omits the (potentially large) scene payload.</summary>
public record PlanSummary
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}

public record CreatePlanRequest(string Name, string Scene);

public record UpdatePlanRequest(string Name, string Scene);
