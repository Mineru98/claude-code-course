import { NextResponse } from "next/server";

import { clearCompleted, createTodo, listTodos } from "@todo/store";
import { isTodoPriority } from "@todo/types";

export const dynamic = "force-dynamic";

/** GET /api/todos — 전체 할 일 목록. */
export async function GET() {
  const todos = await listTodos();
  return NextResponse.json({ todos });
}

/** POST /api/todos — 새 할 일 생성. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "요청 본문이 올바른 JSON 이 아닙니다." },
      { status: 400 },
    );
  }

  const { title, priority } = (body ?? {}) as {
    title?: unknown;
    priority?: unknown;
  };

  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json(
      { error: "제목(title)은 비어 있을 수 없습니다." },
      { status: 400 },
    );
  }

  if (priority !== undefined && !isTodoPriority(priority)) {
    return NextResponse.json(
      { error: "우선순위(priority) 값이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const todo = await createTodo({ title, priority });
  return NextResponse.json({ todo }, { status: 201 });
}

/** DELETE /api/todos — 완료된 할 일 일괄 정리. */
export async function DELETE() {
  const removed = await clearCompleted();
  return NextResponse.json({ removed });
}
