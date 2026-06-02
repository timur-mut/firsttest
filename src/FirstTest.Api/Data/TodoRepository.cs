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
            SELECT id, title, is_complete AS IsComplete, created_at AS CreatedAt
            FROM todos
            ORDER BY id;
            """;
        return await conn.QueryAsync<TodoItem>(sql);
    }

    public async Task<TodoItem?> GetByIdAsync(int id)
    {
        using var conn = _factory.CreateConnection();
        const string sql = """
            SELECT id, title, is_complete AS IsComplete, created_at AS CreatedAt
            FROM todos
            WHERE id = @id;
            """;
        return await conn.QuerySingleOrDefaultAsync<TodoItem>(sql, new { id });
    }

    public async Task<TodoItem> CreateAsync(CreateTodoRequest request)
    {
        using var conn = _factory.CreateConnection();
        const string sql = """
            INSERT INTO todos (title, is_complete)
            VALUES (@Title, false)
            RETURNING id, title, is_complete AS IsComplete, created_at AS CreatedAt;
            """;
        return await conn.QuerySingleAsync<TodoItem>(sql, new { request.Title });
    }

    public async Task<TodoItem?> UpdateAsync(int id, UpdateTodoRequest request)
    {
        using var conn = _factory.CreateConnection();
        const string sql = """
            UPDATE todos
            SET title = @Title, is_complete = @IsComplete
            WHERE id = @id
            RETURNING id, title, is_complete AS IsComplete, created_at AS CreatedAt;
            """;
        return await conn.QuerySingleOrDefaultAsync<TodoItem>(
            sql, new { id, request.Title, request.IsComplete });
    }

    public async Task<bool> DeleteAsync(int id)
    {
        using var conn = _factory.CreateConnection();
        const string sql = "DELETE FROM todos WHERE id = @id;";
        var rows = await conn.ExecuteAsync(sql, new { id });
        return rows > 0;
    }
}
