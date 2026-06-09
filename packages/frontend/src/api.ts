export interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

const BASE = "/api/todos";
export const MAX_TITLE_LEN = 200;

/** 서버 에러 본문(JSON {error})을 우선 사용하고, 없으면 fallback 메시지 사용 */
async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (data && typeof data.error === "string") return data.error;
  } catch {
    /* 본문이 JSON이 아니면 무시 */
  }
  return fallback;
}

/** 응답이 Todo 형태인지 런타임 검증 (UI-17) */
function assertTodo(value: unknown): Todo {
  if (
    !value ||
    typeof value !== "object" ||
    typeof (value as Todo).id !== "number" ||
    typeof (value as Todo).title !== "string" ||
    typeof (value as Todo).completed !== "boolean"
  ) {
    throw new Error("서버 응답 형식이 올바르지 않습니다.");
  }
  return value as Todo;
}

export async function fetchTodos(): Promise<Todo[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error(await errorMessage(res, "목록을 불러오지 못했습니다."));
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("서버 응답 형식이 올바르지 않습니다.");
  return data.map(assertTodo);
}

export async function createTodo(title: string): Promise<Todo> {
  // 클라이언트 측 보조 검증 (SEC-9) — 보안의 본질적 강제는 서버에서 수행
  const trimmed = title.trim();
  if (!trimmed) throw new Error("할 일을 입력하세요.");
  if (trimmed.length > MAX_TITLE_LEN)
    throw new Error(`제목은 최대 ${MAX_TITLE_LEN}자까지 가능합니다.`);

  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: trimmed }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, "추가에 실패했습니다."));
  return assertTodo(await res.json());
}

export async function updateTodo(
  id: number,
  patch: Partial<Pick<Todo, "title" | "completed">>
): Promise<Todo> {
  if (typeof patch.title === "string") {
    const trimmed = patch.title.trim();
    if (!trimmed) throw new Error("제목은 비어 있을 수 없습니다.");
    if (trimmed.length > MAX_TITLE_LEN)
      throw new Error(`제목은 최대 ${MAX_TITLE_LEN}자까지 가능합니다.`);
    patch = { ...patch, title: trimmed };
  }

  const res = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await errorMessage(res, "수정에 실패했습니다."));
  return assertTodo(await res.json());
}

export async function deleteTodo(id: number): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await errorMessage(res, "삭제에 실패했습니다."));
}
