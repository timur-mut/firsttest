namespace FirstTest.Api.Models;

public record TodoItem
{
    public int Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Status { get; init; } = TodoStatus.Todo;
    public int Position { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
}

public record CreateTodoRequest(string Title);

public record UpdateTodoRequest(string Title, string Status);

public record ReorderRequest(string Status, IReadOnlyList<int> Ids);

public static class TodoStatus
{
    public const string Todo = "todo";
    public const string Active = "active";
    public const string Done = "done";

    public static readonly string[] All = [Todo, Active, Done];

    public static bool IsValid(string? status) =>
        status is not null && Array.IndexOf(All, status) >= 0;
}
