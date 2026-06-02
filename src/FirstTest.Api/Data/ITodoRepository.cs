using FirstTest.Api.Models;

namespace FirstTest.Api.Data;

public interface ITodoRepository
{
    Task<IEnumerable<TodoItem>> GetAllAsync();
    Task<TodoItem?> GetByIdAsync(int id);
    Task<TodoItem> CreateAsync(CreateTodoRequest request);
    Task<TodoItem?> UpdateAsync(int id, UpdateTodoRequest request);
    Task<bool> DeleteAsync(int id);
}
