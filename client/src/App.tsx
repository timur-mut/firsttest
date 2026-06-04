import { useEffect, useRef, useState } from 'react';
import { todosApi } from './api/todos';
import type { TodoItem, TodoStatus } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Pencil, Trash2, Check, X, GripVertical } from 'lucide-react';

const COLUMNS: { status: TodoStatus; title: string }[] = [
  { status: 'todo', title: 'Todo' },
  { status: 'active', title: 'Active' },
  { status: 'done', title: 'Done' },
];

const serialize = (list: TodoItem[]) =>
  list.map((t) => `${t.id}:${t.status}`).join(',');

export default function App() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [draggingId, setDraggingId] = useState<number | null>(null);
  // Snapshot of the order/columns when a drag begins, to persist only on change.
  const orderBeforeDrag = useRef<string | null>(null);

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
      await todosApi.update(todo.id, { title: trimmed, status: todo.status });
      await refresh();
    }
    cancelEdit();
  }

  function handleDragStart(e: React.DragEvent, id: number) {
    setDraggingId(id);
    orderBeforeDrag.current = serialize(todos);
    e.dataTransfer.effectAllowed = 'move';
  }

  // Hovering over a card: slot the dragged card into that position (and adopt
  // the hovered card's column) so the board previews the drop live.
  function handleCardDragOver(e: React.DragEvent, over: TodoItem) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (draggingId === null || draggingId === over.id) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const after = e.clientY > rect.top + rect.height / 2;

    setTodos((prev) => {
      const dragged = prev.find((t) => t.id === draggingId);
      if (!dragged) return prev;
      const next = prev.filter((t) => t.id !== draggingId);
      const overIdx = next.findIndex((t) => t.id === over.id);
      if (overIdx === -1) return prev;
      next.splice(overIdx + (after ? 1 : 0), 0, { ...dragged, status: over.status });
      return next;
    });
  }

  // Hovering over column space (e.g. an empty column or below the last card):
  // move the dragged card to the end of that column.
  function handleColumnDragOver(e: React.DragEvent, status: TodoStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggingId === null) return;

    setTodos((prev) => {
      const dragged = prev.find((t) => t.id === draggingId);
      if (!dragged) return prev;
      const next = prev.filter((t) => t.id !== draggingId);
      let insertAt = next.length;
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].status === status) {
          insertAt = i + 1;
          break;
        }
      }
      next.splice(insertAt, 0, { ...dragged, status });
      return next;
    });
  }

  // dragend always fires at the end of a drag. The board already shows the
  // previewed order, so persist the dragged card's destination column.
  async function handleDragEnd() {
    const before = orderBeforeDrag.current;
    orderBeforeDrag.current = null;
    const draggedId = draggingId;
    setDraggingId(null);
    if (draggedId === null) return;

    if (before !== null && before === serialize(todos)) return; // nothing moved

    const dragged = todos.find((t) => t.id === draggedId);
    if (!dragged) return;
    const ids = todos.filter((t) => t.status === dragged.status).map((t) => t.id);

    try {
      setTodos(await todosApi.reorder(dragged.status, ids));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      await refresh(); // revert to server order
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
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

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {COLUMNS.map((col) => {
          const items = todos.filter((t) => t.status === col.status);
          return (
            <section
              key={col.status}
              onDragOver={(e) => handleColumnDragOver(e, col.status)}
              onDrop={(e) => e.preventDefault()}
              className="flex flex-col rounded-lg border bg-muted/30 p-3"
            >
              <header className="mb-3 flex items-center justify-between px-1">
                <h2 className="text-sm font-semibold">{col.title}</h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {items.length}
                </span>
              </header>

              <ul className="flex min-h-24 flex-1 flex-col gap-2">
                {items.map((todo) => (
                  <li
                    key={todo.id}
                    draggable={editingId !== todo.id}
                    onDragStart={(e) => handleDragStart(e, todo.id)}
                    onDragOver={(e) => handleCardDragOver(e, todo)}
                    onDrop={(e) => e.preventDefault()}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center justify-between gap-2 rounded-md border px-3 py-2 ${
                      draggingId === todo.id
                        ? 'border-dashed border-primary bg-primary/5 [&>*]:invisible'
                        : 'cursor-grab border-border bg-card active:cursor-grabbing'
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
                        <div className="flex min-w-0 items-center gap-2">
                          <GripVertical className="size-4 shrink-0 text-muted-foreground" />
                          <span
                            className={`truncate ${
                              todo.status === 'done'
                                ? 'text-muted-foreground line-through'
                                : ''
                            }`}
                          >
                            {todo.title}
                          </span>
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

                {items.length === 0 && (
                  <li className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                    Drop here
                  </li>
                )}
              </ul>
            </section>
          );
        })}
      </div>

      {!loading && todos.length === 0 && !error && (
        <p className="mt-4 text-sm text-muted-foreground">
          No todos yet — add one above.
        </p>
      )}
    </main>
  );
}
