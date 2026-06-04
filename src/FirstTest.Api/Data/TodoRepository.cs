using Dapper;
using FirstTest.Api.Models;

namespace FirstTest.Api.Data;

public sealed class TodoRepository : ITodoRepository
{
    private readonly IDbConnectionFactory _factory;

    public TodoRepository(IDbConnectionFactory factory) => _factory = factory;

    public async Task<IEnumerable<TodoItem>> GetAllAsync()
    {
        using var conn = _factory.CreateConnection();
        const string sql = """
            SELECT id, title, status AS Status, position AS Position, created_at AS CreatedAt
            FROM todos
            ORDER BY status, position, id;
            """;
        return await conn.QueryAsync<TodoItem>(sql);
    }

    public async Task<TodoItem?> GetByIdAsync(int id)
    {
        using var conn = _factory.CreateConnection();
        const string sql = """
            SELECT id, title, status AS Status, position AS Position, created_at AS CreatedAt
            FROM todos
            WHERE id = @id;
            """;
        return await conn.QuerySingleOrDefaultAsync<TodoItem>(sql, new { id });
    }

    public async Task<TodoItem> CreateAsync(CreateTodoRequest request)
    {
        using var conn = _factory.CreateConnection();
        const string sql = """
            INSERT INTO todos (title, status, position)
            VALUES (@Title, 'todo',
                    (SELECT COALESCE(MAX(position), 0) + 1 FROM todos WHERE status = 'todo'))
            RETURNING id, title, status AS Status, position AS Position, created_at AS CreatedAt;
            """;
        return await conn.QuerySingleAsync<TodoItem>(sql, new { request.Title });
    }

    public async Task<TodoItem?> UpdateAsync(int id, UpdateTodoRequest request)
    {
        using var conn = _factory.CreateConnection();
        const string sql = """
            UPDATE todos
            SET title = @Title, status = @Status
            WHERE id = @id
            RETURNING id, title, status AS Status, position AS Position, created_at AS CreatedAt;
            """;
        return await conn.QuerySingleOrDefaultAsync<TodoItem>(
            sql, new { id, request.Title, request.Status });
    }

    public async Task<bool> DeleteAsync(int id)
    {
        using var conn = _factory.CreateConnection();
        const string sql = "DELETE FROM todos WHERE id = @id;";
        var rows = await conn.ExecuteAsync(sql, new { id });
        return rows > 0;
    }

    public async Task ReorderAsync(string status, IReadOnlyList<int> orderedIds)
    {
        using var conn = _factory.CreateConnection();
        conn.Open();
        using var tx = conn.BeginTransaction();

        // Assign the target status and a sequential position to each id in order.
        // Moving a card across columns is just a reorder of the destination column.
        const string sql = "UPDATE todos SET status = @Status, position = @Position WHERE id = @Id;";
        for (var i = 0; i < orderedIds.Count; i++)
        {
            await conn.ExecuteAsync(
                sql, new { Status = status, Position = i + 1, Id = orderedIds[i] }, tx);
        }

        tx.Commit();
    }
}
