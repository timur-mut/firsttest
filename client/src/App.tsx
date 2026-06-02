import { useEffect, useState } from 'react';
import { todosApi } from './api/todos';
import type { TodoItem } from './types';

export default function App() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      setTodos(await todosApi.list());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function addTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await todosApi.create({ title: title.trim() });
    setTitle('');
    await refresh();
  }

  async function toggle(todo: TodoItem) {
    await todosApi.update(todo.id, {
      title: todo.title,
      isComplete: !todo.isComplete,
    });
    await refresh();
  }

  async function remove(id: number) {
    await todosApi.remove(id);
    await refresh();
  }

  return (
    <main className="container">
      <h1>FirstTest</h1>
      <p className="subtitle">.NET Minimal API + Dapper + DbUp · React + Vite</p>

      <form onSubmit={addTodo} className="add-form">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs doing?"
          aria-label="New todo title"
        />
        <button type="submit">Add</button>
      </form>

      {error && <p className="error">Could not reach the API: {error}</p>}
      {loading && <p>Loading…</p>}

      <ul className="todo-list">
        {todos.map((todo) => (
          <li key={todo.id} className={todo.isComplete ? 'done' : ''}>
            <label>
              <input
                type="checkbox"
                checked={todo.isComplete}
                onChange={() => toggle(todo)}
              />
              <span>{todo.title}</span>
            </label>
            <button className="link" onClick={() => remove(todo.id)}>
              delete
            </button>
          </li>
        ))}
      </ul>

      {!loading && todos.length === 0 && !error && (
        <p className="empty">No todos yet — add one above.</p>
      )}
    </main>
  );
}
