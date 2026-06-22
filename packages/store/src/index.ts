/**
 * 파일 기반 할 일 저장소.
 *
 * DB 없이 JSON 파일 하나에 모든 할 일을 영속화한다. 서버(Route Handler)
 * 에서만 import 되어야 하며, 클라이언트 번들에 포함되어서는 안 된다.
 *
 * 저장 경로는 `TODO_DATA_FILE` 환경변수로 덮어쓸 수 있고, 기본값은
 * 프로세스 작업 디렉터리 기준 `.data/todos.json` 이다.
 */
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type {
  CreateTodoInput,
  Todo,
  UpdateTodoInput,
} from "@todo/types";

const DATA_FILE =
  process.env.TODO_DATA_FILE ?? join(process.cwd(), ".data", "todos.json");

/**
 * 직렬화된 쓰기 잠금. 동시 요청이 같은 파일을 덮어써 데이터가
 * 유실되는 것을 막기 위해 모든 변경 작업을 한 줄로 직렬화한다.
 */
let writeLock: Promise<unknown> = Promise.resolve();

function withLock<T>(task: () => Promise<T>): Promise<T> {
  const run = writeLock.then(task, task);
  // 다음 작업이 실패 여부와 무관하게 이어지도록 잠금 체인을 정리한다.
  writeLock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readAll(): Promise<Todo[]> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Todo[]) : [];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function writeAll(todos: Todo[]): Promise<void> {
  await mkdir(dirname(DATA_FILE), { recursive: true });
  await writeFile(DATA_FILE, `${JSON.stringify(todos, null, 2)}\n`, "utf8");
}

/** 최신 생성순으로 정렬된 전체 할 일을 반환한다. */
export async function listTodos(): Promise<Todo[]> {
  const todos = await readAll();
  return todos.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** 단일 할 일을 조회한다. 없으면 null. */
export async function getTodo(id: string): Promise<Todo | null> {
  const todos = await readAll();
  return todos.find((todo) => todo.id === id) ?? null;
}

/** 새 할 일을 생성한다. */
export function createTodo(input: CreateTodoInput): Promise<Todo> {
  return withLock(async () => {
    const todos = await readAll();
    const now = new Date().toISOString();
    const todo: Todo = {
      id: randomUUID(),
      title: input.title.trim(),
      completed: false,
      priority: input.priority ?? "medium",
      createdAt: now,
      updatedAt: now,
    };
    todos.push(todo);
    await writeAll(todos);
    return todo;
  });
}

/** 할 일을 부분 수정한다. 대상이 없으면 null. */
export function updateTodo(
  id: string,
  patch: UpdateTodoInput,
): Promise<Todo | null> {
  return withLock(async () => {
    const todos = await readAll();
    const index = todos.findIndex((todo) => todo.id === id);
    if (index === -1) {
      return null;
    }

    const current = todos[index] as Todo;
    const next: Todo = {
      ...current,
      ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
      ...(patch.completed !== undefined ? { completed: patch.completed } : {}),
      ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
      updatedAt: new Date().toISOString(),
    };
    todos[index] = next;
    await writeAll(todos);
    return next;
  });
}

/** 할 일을 삭제한다. 삭제됐으면 true. */
export function deleteTodo(id: string): Promise<boolean> {
  return withLock(async () => {
    const todos = await readAll();
    const next = todos.filter((todo) => todo.id !== id);
    if (next.length === todos.length) {
      return false;
    }
    await writeAll(next);
    return true;
  });
}

/** 완료된 할 일을 모두 제거하고 제거된 개수를 반환한다. */
export function clearCompleted(): Promise<number> {
  return withLock(async () => {
    const todos = await readAll();
    const next = todos.filter((todo) => !todo.completed);
    const removed = todos.length - next.length;
    if (removed > 0) {
      await writeAll(next);
    }
    return removed;
  });
}
