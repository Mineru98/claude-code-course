import { randomUUID } from "node:crypto";
import type { Todo, CreateTodoInput, UpdateTodoInput } from "@todo/shared";

/**
 * 인메모리 Todo 저장소.
 * 프로세스가 살아있는 동안만 데이터가 유지되며, 서버를 재시작하면 초기화된다.
 */
class TodoStore {
  private todos: Todo[] = [];

  list(): Todo[] {
    // 최신 항목이 위로 오도록 생성 역순 정렬
    return [...this.todos].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  }

  create(input: CreateTodoInput): Todo {
    const todo: Todo = {
      id: randomUUID(),
      title: input.title,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    this.todos.push(todo);
    return todo;
  }

  update(id: string, input: UpdateTodoInput): Todo | null {
    const todo = this.todos.find((t) => t.id === id);
    if (!todo) return null;

    if (input.title !== undefined) todo.title = input.title;
    if (input.completed !== undefined) todo.completed = input.completed;
    return todo;
  }

  remove(id: string): boolean {
    const before = this.todos.length;
    this.todos = this.todos.filter((t) => t.id !== id);
    return this.todos.length < before;
  }
}

export const todoStore = new TodoStore();
