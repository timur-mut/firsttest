namespace FirstTest.Api.Models;

public record TodoItem
{
    public int Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public bool IsComplete { get; init; }
    public int Position { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}

public record CreateTodoRequest(string Title);

public record UpdateTodoRequest(string Title, bool IsComplete);

public record ReorderRequest(IReadOnlyList<int> Ids);
