import { NextResponse } from "next/server";

import { deleteTodo, updateTodo } from "@todo/store";
import { isTodoPriority, type UpdateTodoInput } from "@todo/types";

type RouteContext = { params: Promise<{ id: string }> };

/** PATCH /api/todos/:id — 할 일 부분 수정. */
export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "요청 본문이 올바른 JSON 이 아닙니다." },
      { status: 400 },
    );
  }

  const { title, completed, priority } = (body ?? {}) as {
    title?: unknown;
    completed?: unknown;
    priority?: unknown;
  };

  const patch: UpdateTodoInput = {};

  if (title !== undefined) {
    if (typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "제목(title)은 비어 있을 수 없습니다." },
        { status: 400 },
      );
    }
    patch.title = title;
  }

  if (completed !== undefined) {
    if (typeof completed !== "boolean") {
      return NextResponse.json(
        { error: "completed 는 boolean 이어야 합니다." },
        { status: 400 },
      );
    }
    patch.completed = completed;
  }

  if (priority !== undefined) {
    if (!isTodoPriority(priority)) {
      return NextResponse.json(
        { error: "우선순위(priority) 값이 올바르지 않습니다." },
        { status: 400 },
      );
    }
    patch.priority = priority;
  }

  const todo = await updateTodo(id, patch);
  if (!todo) {
    return NextResponse.json(
      { error: "해당 할 일을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  return NextResponse.json({ todo });
}

/** DELETE /api/todos/:id — 할 일 삭제. */
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  const removed = await deleteTodo(id);
  if (!removed) {
    return NextResponse.json(
      { error: "해당 할 일을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
