"use client";

import { useState, type SubmitEvent } from "react";

import type { TodoPriority } from "@todo/types";

const PRIORITY_OPTIONS: ReadonlyArray<{ value: TodoPriority; label: string }> = [
  { value: "low", label: "낮음" },
  { value: "medium", label: "보통" },
  { value: "high", label: "높음" },
];

type TodoInputProps = {
  onAdd: (title: string, priority: TodoPriority) => void;
  pending: boolean;
};

export function TodoInput({ onAdd, pending }: TodoInputProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TodoPriority>("medium");

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (trimmed.length === 0) return;
    onAdd(trimmed, priority);
    setTitle("");
    setPriority("medium");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white/70 p-2 shadow-sm shadow-slate-200/40 backdrop-blur sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none"
    >
      <input
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="할 일을 입력하세요"
        aria-label="할 일 제목"
        className="min-w-0 flex-1 rounded-xl bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
      />
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor="todo-priority">
          우선순위
        </label>
        <select
          id="todo-priority"
          value={priority}
          onChange={(event) =>
            setPriority(event.target.value as TodoPriority)
          }
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none transition focus:border-violet-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
        >
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending || title.trim().length === 0}
          className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-slate-900"
        >
          추가
        </button>
      </div>
    </form>
  );
}
