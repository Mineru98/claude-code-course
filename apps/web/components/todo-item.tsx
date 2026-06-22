"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import type { Todo, TodoPriority } from "@todo/types";

const PRIORITY_META: Record<
  TodoPriority,
  { label: string; badge: string }
> = {
  high: {
    label: "높음",
    badge:
      "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
  },
  medium: {
    label: "보통",
    badge:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  },
  low: {
    label: "낮음",
    badge:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  },
};

// 뱃지를 클릭하면 낮음 → 보통 → 높음 순으로 우선순위가 순환한다.
const PRIORITY_CYCLE: readonly TodoPriority[] = ["low", "medium", "high"];

function nextPriority(current: TodoPriority): TodoPriority {
  const index = PRIORITY_CYCLE.indexOf(current);
  return PRIORITY_CYCLE[(index + 1) % PRIORITY_CYCLE.length] as TodoPriority;
}

type TodoItemProps = {
  todo: Todo;
  onToggle: (todo: Todo) => void;
  onRemove: (todo: Todo) => void;
  onRename: (todo: Todo, title: string) => void;
  onPriorityChange: (todo: Todo, priority: TodoPriority) => void;
};

export function TodoItem({
  todo,
  onToggle,
  onRemove,
  onRename,
  onPriorityChange,
}: TodoItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function startEditing() {
    setDraft(todo.title);
    setEditing(true);
  }

  function commitEditing() {
    setEditing(false);
    onRename(todo, draft);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      commitEditing();
    } else if (event.key === "Escape") {
      setDraft(todo.title);
      setEditing(false);
    }
  }

  const priority = PRIORITY_META[todo.priority];

  return (
    <li className="group flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
      <button
        type="button"
        role="checkbox"
        aria-checked={todo.completed}
        aria-label={todo.completed ? "완료 취소" : "완료 처리"}
        onClick={() => onToggle(todo)}
        className={
          "flex size-5 shrink-0 items-center justify-center rounded-md border transition " +
          (todo.completed
            ? "border-violet-600 bg-violet-600 text-white"
            : "border-slate-300 bg-transparent hover:border-violet-400 dark:border-slate-600")
        }
      >
        {todo.completed ? (
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-3.5"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 0 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z"
              clipRule="evenodd"
            />
          </svg>
        ) : null}
      </button>

      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitEditing}
            onKeyDown={handleKeyDown}
            aria-label="할 일 제목 수정"
            className="w-full rounded-md border border-violet-300 bg-white px-2 py-1 text-sm outline-none dark:border-violet-700 dark:bg-slate-800"
          />
        ) : (
          <button
            type="button"
            onDoubleClick={startEditing}
            title="더블클릭하여 수정"
            className={
              "block w-full truncate text-left text-sm transition " +
              (todo.completed
                ? "text-slate-400 line-through dark:text-slate-600"
                : "text-slate-700 dark:text-slate-200")
            }
          >
            {todo.title}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => onPriorityChange(todo, nextPriority(todo.priority))}
        title="클릭하여 우선순위 변경"
        className={
          "shrink-0 rounded-full px-2 py-0.5 text-[0.7rem] font-semibold transition " +
          priority.badge
        }
      >
        {priority.label}
      </button>

      <button
        type="button"
        onClick={() => onRemove(todo)}
        aria-label="삭제"
        className="shrink-0 rounded-md p-1 text-slate-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-500 focus-visible:opacity-100 group-hover:opacity-100 dark:text-slate-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
      >
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="size-4"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M8.5 2a1 1 0 0 0-.95.68L7.2 3.7H4a1 1 0 0 0 0 2h.3l.7 9.3A2 2 0 0 0 7 17h6a2 2 0 0 0 2-1.9l.7-9.4H16a1 1 0 1 0 0-2h-3.2l-.35-1.02A1 1 0 0 0 11.5 2h-3Zm2.5 5a.75.75 0 0 0-1.5 0v6a.75.75 0 0 0 1.5 0V7Zm-3.25-.75A.75.75 0 0 1 8.5 7v6a.75.75 0 0 1-1.5 0V7a.75.75 0 0 1 .75-.75Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </li>
  );
}
