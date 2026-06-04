export type TodoStatus = 'todo' | 'active' | 'done';

export interface TodoItem {
  id: number;
  title: string;
  status: TodoStatus;
  position: number;
  createdAt: string;
}

export interface CreateTodoRequest {
  title: string;
}

export interface UpdateTodoRequest {
  title: string;
  status: TodoStatus;
}
