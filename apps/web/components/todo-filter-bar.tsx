"use client";

import type { TodoFilter } from "@todo/types";

const FILTERS: ReadonlyArray<{ value: TodoFilter; label: string }> = [
  { value: "all", label: "전체" },
  { value: "active", label: "진행 중" },
  { value: "completed", label: "완료" },
];

type TodoFilterBarProps = {
  filter: TodoFilter;
  onFilterChange: (filter: TodoFilter) => void;
  remaining: number;
  total: number;
  hasCompleted: boolean;
  onClearCompleted: () => void;
};

export function TodoFilterBar({
  filter,
  onFilterChange,
  remaining,
  total,
  hasCompleted,
  onClearCompleted,
}: TodoFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {total === 0 ? (
          "할 일이 없습니다"
        ) : (
          <>
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {remaining}
            </span>
            개 남음 · 총 {total}개
          </>
        )}
      </p>

      <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
        {FILTERS.map((item) => {
          const active = item.value === filter;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onFilterChange(item.value)}
              aria-pressed={active}
              className={
                "rounded-md px-3 py-1 text-xs font-medium transition " +
                (active
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200")
              }
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onClearCompleted}
        disabled={!hasCompleted}
        className="text-xs font-medium text-slate-400 transition hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-slate-400 dark:hover:text-rose-400"
      >
        완료 항목 정리
      </button>
    </div>
  );
}
