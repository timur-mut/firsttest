import { useEffect, useState } from 'react';
import { todosApi } from './api/todos';
import type { TodoItem } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Pencil, Trash2, Check, X } from 'lucide-react';

export default function App() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');

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

  function startEdit(todo: TodoItem) {
    setEditingId(todo.id);
    setEditTitle(todo.title);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle('');
  }

  async function saveEdit(todo: TodoItem) {
    const trimmed = editTitle.trim();
    if (!trimmed) return;
    if (trimmed !== todo.title) {
      await todosApi.update(todo.id, {
        title: trimmed,
        isComplete: todo.isComplete,
      });
      await refresh();
    }
    cancelEdit();
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">FirstTest</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            .NET Minimal API + Dapper + DbUp · React + Vite
          </p>
        </div>
        <ThemeSwitcher />
      </div>

      <form onSubmit={addTodo} className="mt-6 flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs doing?"
          aria-label="New todo title"
        />
        <Button type="submit">Add</Button>
      </form>

      {error && (
        <p className="mt-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Could not reach the API: {error}
        </p>
      )}
      {loading && <p className="mt-4 text-sm text-muted-foreground">Loading…</p>}

      <ul className="mt-4 space-y-2">
        {todos.map((todo) => (
          <li
            key={todo.id}
            className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2"
          >
            {editingId === todo.id ? (
              <>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit(todo);
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  aria-label="Edit todo title"
                  autoFocus
                />
                <div className="flex shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => saveEdit(todo)}
                    aria-label="Save todo"
                  >
                    <Check />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={cancelEdit}
                    aria-label="Cancel edit"
                  >
                    <X />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <label className="flex cursor-pointer items-center gap-3">
                  <Checkbox
                    checked={todo.isComplete}
                    onCheckedChange={() => toggle(todo)}
                  />
                  <span
                    className={
                      todo.isComplete ? 'text-muted-foreground line-through' : ''
                    }
                  >
                    {todo.title}
                  </span>
                </label>
                <div className="flex shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => startEdit(todo)}
                    aria-label="Edit todo"
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(todo.id)}
                    aria-label="Delete todo"
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {!loading && todos.length === 0 && !error && (
        <p className="mt-4 text-sm text-muted-foreground">
          No todos yet — add one above.
        </p>
      )}
    </main>
  );
}
