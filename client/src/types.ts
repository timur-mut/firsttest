export interface TodoItem {
  id: number;
  title: string;
  isComplete: boolean;
  createdAt: string;
}

export interface CreateTodoRequest {
  title: string;
}

export interface UpdateTodoRequest {
  title: string;
  isComplete: boolean;
}
