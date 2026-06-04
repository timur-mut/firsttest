import { Fragment, useEffect, useRef, useState } from 'react';
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

// Where a dragged card would drop: into `status`, before the card with id
// `beforeId` (or at the end of the column when beforeId is null).
type DropTarget = { status: TodoStatus; beforeId: number | null };

export default function App() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  // Refs mirror the drag state so dragend reads current values, not a stale
  // closure. The dragged card is never moved in the DOM during the drag (that
  // would unmount it across columns and cancel the native drag), so the move
  // is computed once here and applied on drop.
  const draggingIdRef = useRef<number | null>(null);
  const dropTargetRef = useRef<DropTarget | null>(null);

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
    draggingIdRef.current = id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(id)); // required for Firefox
  }

  function setTarget(status: TodoStatus, beforeId: number | null) {
    dropTargetRef.current = { status, beforeId };
    setDropTarget((prev) =>
      prev && prev.status === status && prev.beforeId === beforeId
        ? prev
        : { status, beforeId },
    );
  }

  // Hovering a card sets the placeholder before or after it (by pointer Y),
  // without moving the dragged card.
  function handleCardDragOver(e: React.DragEvent, over: TodoItem) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    const draggedId = draggingIdRef.current;
    if (draggedId === null || over.id === draggedId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const after = e.clientY > rect.top + rect.height / 2;
    const colItems = todos.filter((t) => t.status === over.status && t.id !== draggedId);
    const pos = colItems.findIndex((t) => t.id === over.id);
    const beforeId = after ? colItems[pos + 1]?.id ?? null : over.id;
    setTarget(over.status, beforeId);
  }

  // Hovering empty column space targets the end of that column.
  function handleColumnDragOver(e: React.DragEvent, status: TodoStatus) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggingIdRef.current === null) return;
    setTarget(status, null);
  }

  async function handleDragEnd() {
    const draggedId = draggingIdRef.current;
    const target = dropTargetRef.current;
    draggingIdRef.current = null;
    dropTargetRef.current = null;
    setDraggingId(null);
    setDropTarget(null);
    if (draggedId === null || !target) return;

    const dragged = todos.find((t) => t.id === draggedId);
    if (!dragged) return;

    // Build the destination column's id list with the dragged card inserted.
    const dest = todos
      .filter((t) => t.status === target.status && t.id !== draggedId)
      .map((t) => t.id);
    const at = target.beforeId == null ? dest.length : dest.indexOf(target.beforeId);
    dest.splice(at < 0 ? dest.length : at, 0, draggedId);

    // Skip the API call when nothing actually changed.
    const currentCol = todos.filter((t) => t.status === target.status).map((t) => t.id);
    if (dragged.status === target.status && currentCol.join(',') === dest.join(',')) return;

    // Optimistic: reflect the move locally, then reconcile with the server.
    const destSet = new Set(dest);
    const byId = new Map(todos.map((t) => [t.id, t]));
    const rest = todos.filter((t) => !destSet.has(t.id));
    const movedCol = dest.map((id) => ({ ...byId.get(id)!, status: target.status }));
    setTodos([...rest, ...movedCol]);

    try {
      setTodos(await todosApi.reorder(target.status, dest));
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
          const ph =
            dropTarget && dropTarget.status === col.status && draggingId !== null
              ? dropTarget
              : null;
          const placeholder = (
            <li
              aria-hidden
              className="h-11 rounded-md border-2 border-dashed border-primary bg-primary/5"
            />
          );
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
                  <Fragment key={todo.id}>
                    {ph && ph.beforeId === todo.id && placeholder}
                    <li
                      draggable={editingId !== todo.id}
                      onDragStart={(e) => handleDragStart(e, todo.id)}
                      onDragOver={(e) => handleCardDragOver(e, todo)}
                      onDrop={(e) => e.preventDefault()}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 ${
                        draggingId === todo.id
                          ? 'opacity-40'
                          : 'cursor-grab active:cursor-grabbing'
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
                  </Fragment>
                ))}

                {ph && ph.beforeId === null && placeholder}

                {items.length === 0 && !ph && (
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
