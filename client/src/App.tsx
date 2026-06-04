import { useEffect, useRef, useState } from 'react';
import { todosApi } from './api/todos';
import type { TodoItem } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Pencil, Trash2, Check, X, GripVertical } from 'lucide-react';

export default function App() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [dragEnabled, setDragEnabled] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  // Snapshot of the order when a drag begins, so we only persist on a real change.
  const orderBeforeDrag = useRef<number[] | null>(null);

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

  function handleDragStart(e: React.DragEvent, id: number) {
    setDraggingId(id);
    orderBeforeDrag.current = todos.map((t) => t.id);
    e.dataTransfer.effectAllowed = 'move';
  }

  // Live preview: slot the dragged item into the hovered position so the list
  // reflows and the dragged row shows as a placeholder where it will land.
  function handleDragOver(e: React.DragEvent, overId: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggingId === null || draggingId === overId) return;
    setTodos((prev) => {
      const from = prev.findIndex((t) => t.id === draggingId);
      const to = prev.findIndex((t) => t.id === overId);
      if (from === -1 || to === -1 || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  // dragend always fires at the end of a drag (drop, cancel, or release).
  // The list already shows the previewed order, so persist it if it changed.
  async function handleDragEnd() {
    const before = orderBeforeDrag.current;
    orderBeforeDrag.current = null;
    setDraggingId(null);
    setDragEnabled(false);

    const after = todos.map((t) => t.id);
    if (!before || before.join(',') === after.join(',')) return;

    try {
      setTodos(await todosApi.reorder(after));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      await refresh(); // revert to server order
    }
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
            draggable={dragEnabled && editingId !== todo.id}
            onDragStart={(e) => handleDragStart(e, todo.id)}
            onDragOver={(e) => handleDragOver(e, todo.id)}
            onDrop={(e) => e.preventDefault()}
            onDragEnd={handleDragEnd}
            className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 ${
              draggingId === todo.id
                ? 'border-dashed border-primary bg-primary/5 [&>*]:invisible'
                : 'border-border bg-card'
            }`}
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
                <div className="flex min-w-0 items-center gap-1">
                  <button
                    type="button"
                    onMouseDown={() => setDragEnabled(true)}
                    onMouseUp={() => setDragEnabled(false)}
                    className="shrink-0 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
                    aria-label="Drag to reorder"
                  >
                    <GripVertical className="size-4" />
                  </button>
                  <label className="flex min-w-0 cursor-pointer items-center gap-3">
                    <Checkbox
                      checked={todo.isComplete}
                      onCheckedChange={() => toggle(todo)}
                    />
                    <span
                      className={
                        todo.isComplete
                          ? 'truncate text-muted-foreground line-through'
                          : 'truncate'
                      }
                    >
                      {todo.title}
                    </span>
                  </label>
                </div>
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
