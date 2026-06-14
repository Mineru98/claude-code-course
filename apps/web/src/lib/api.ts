import type {
  Todo,
  CreateTodoInput,
  UpdateTodoInput,
} from "@todo/shared";
import { logger } from "@/lib/logger";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  // 메서드는 명시되지 않으면 fetch 기본값인 GET 으로 간주해 로깅한다
  const method = init?.method ?? "GET";
  logger.debug("API 요청", { method, path });

  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    logger.error("API 요청 실패", { method, path, status: res.status });
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
