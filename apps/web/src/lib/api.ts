import type {
  Todo,
  CreateTodoInput,
  UpdateTodoInput,
} from "@todo/shared";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `요청 실패 (${res.status})`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  const json = (await res.json()) as { data: T };
  return json.data;
}

export const todoApi = {
  list: () => request<Todo[]>("/todos"),

  create: (input: CreateTodoInput) =>
    request<Todo>("/todos", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  update: (id: string, input: UpdateTodoInput) =>
    request<Todo>(`/todos/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),

  remove: (id: string) =>
    request<void>(`/todos/${id}`, { method: "DELETE" }),
};
