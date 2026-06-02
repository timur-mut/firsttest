import type {
  TodoItem,
  CreateTodoRequest,
  UpdateTodoRequest,
} from '../types';

// In dev, VITE_API_URL is empty and requests go to /api via the Vite proxy.
// In production, set VITE_API_URL to the deployed API origin.
const BASE = `${import.meta.env.VITE_API_URL ?? ''}/api/todos`;

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const todosApi = {
  list: () => fetch(BASE).then(handle<TodoItem[]>),

  create: (body: CreateTodoRequest) =>
    fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(handle<TodoItem>),

  update: (id: number, body: UpdateTodoRequest) =>
    fetch(`${BASE}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(handle<TodoItem>),

  remove: (id: number) =>
    fetch(`${BASE}/${id}`, { method: 'DELETE' }).then(handle<void>),
};
