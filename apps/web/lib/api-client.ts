/**
 * 브라우저에서 Route Handler(/api/todos)를 호출하는 클라이언트 헬퍼.
 * 공유 타입(@todo/types)을 그대로 사용해 프런트/백 간 타입을 일치시킨다.
 */
import type { CreateTodoInput, Todo, UpdateTodoInput } from "@todo/types";

async function extractError(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json();
    if (
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
    ) {
      return (data as { error: string }).error;
    }
  } catch {
    // 본문이 비었거나 JSON 이 아니면 상태 코드 기반 메시지로 대체한다.
  }
  return `요청에 실패했습니다 (HTTP ${response.status}).`;
}

export async function fetchTodos(): Promise<Todo[]> {
  const response = await fetch("/api/todos", { cache: "no-store" });
  if (!response.ok) throw new Error(await extractError(response));
  const data = (await response.json()) as { todos: Todo[] };
  return data.todos;
}

export async function createTodo(input: CreateTodoInput): Promise<Todo> {
  const response = await fetch("/api/todos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await extractError(response));
  const data = (await response.json()) as { todo: Todo };
  return data.todo;
}

export async function updateTodo(
  id: string,
  patch: UpdateTodoInput,
): Promise<Todo> {
  const response = await fetch(`/api/todos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error(await extractError(response));
  const data = (await response.json()) as { todo: Todo };
  return data.todo;
}

export async function deleteTodo(id: string): Promise<void> {
  const response = await fetch(`/api/todos/${id}`, { method: "DELETE" });
  if (!response.ok && response.status !== 204) {
    throw new Error(await extractError(response));
  }
}

export async function clearCompleted(): Promise<number> {
  const response = await fetch("/api/todos", { method: "DELETE" });
  if (!response.ok) throw new Error(await extractError(response));
  const data = (await response.json()) as { removed: number };
  return data.removed;
}
