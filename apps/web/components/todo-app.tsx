"use client";

import { useCallback, useMemo, useState } from "react";

import type { Todo, TodoFilter, TodoPriority } from "@todo/types";

import * as api from "@/lib/api-client";
import { TodoFilterBar } from "@/components/todo-filter-bar";
import { TodoInput } from "@/components/todo-input";
import { TodoList } from "@/components/todo-list";

export function TodoApp({ initialTodos }: { initialTodos: Todo[] }) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos);
  const [filter, setFilter] = useState<TodoFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleError = useCallback((cause: unknown) => {
    setError(
      cause instanceof Error
        ? cause.message
        : "알 수 없는 오류가 발생했습니다.",
    );
  }, []);

  const visibleTodos = useMemo(() => {
    if (filter === "active") return todos.filter((t) => !t.completed);
    if (filter === "completed") return todos.filter((t) => t.completed);
    return todos;
  }, [todos, filter]);

  const remaining = useMemo(
    () => todos.filter((t) => !t.completed).length,
    [todos],
  );
  const hasCompleted = useMemo(
    () => todos.some((t) => t.completed),
    [todos],
  );

  const addTodo = useCallback(
    async (title: string, priority: TodoPriority) => {
      setError(null);
      setPending(true);
      try {
        const created = await api.createTodo({ title, priority });
        setTodos((prev) => [created, ...prev]);
      } catch (cause) {
        handleError(cause);
      } finally {
        setPending(false);
      }
    },
    [handleError],
  );

  const toggleTodo = useCallback(
    async (todo: Todo) => {
      setError(null);
      const next = !todo.completed;
      // 낙관적 업데이트 후 실패 시 원래 값으로 롤백한다.
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, completed: next } : t)),
      );
      try {
        const updated = await api.updateTodo(todo.id, { completed: next });
        setTodos((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t)),
        );
      } catch (cause) {
        setTodos((prev) =>
          prev.map((t) =>
            t.id === todo.id ? { ...t, completed: todo.completed } : t,
          ),
        );
        handleError(cause);
      }
    },
    [handleError],
  );

  const renameTodo = useCallback(
    async (todo: Todo, rawTitle: string) => {
      const title = rawTitle.trim();
      if (title.length === 0 || title === todo.title) return;
      setError(null);
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, title } : t)),
      );
      try {
        const updated = await api.updateTodo(todo.id, { title });
        setTodos((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t)),
        );
      } catch (cause) {
        setTodos((prev) =>
          prev.map((t) =>
            t.id === todo.id ? { ...t, title: todo.title } : t,
          ),
        );
        handleError(cause);
      }
    },
    [handleError],
  );

  const changePriority = useCallback(
    async (todo: Todo, priority: TodoPriority) => {
      setError(null);
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, priority } : t)),
      );
      try {
        const updated = await api.updateTodo(todo.id, { priority });
        setTodos((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t)),
        );
      } catch (cause) {
        setTodos((prev) =>
          prev.map((t) =>
            t.id === todo.id ? { ...t, priority: todo.priority } : t,
          ),
        );
        handleError(cause);
      }
    },
    [handleError],
  );

  const removeTodo = useCallback(
    async (todo: Todo) => {
      setError(null);
      setTodos((prev) => prev.filter((t) => t.id !== todo.id));
      try {
        await api.deleteTodo(todo.id);
      } catch (cause) {
        // 실패하면 원래 목록으로 되돌린다.
        setTodos((prev) =>
          [...prev, todo].sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt),
          ),
        );
        handleError(cause);
      }
    },
    [handleError],
  );

  const clearCompleted = useCallback(async () => {
    setError(null);
    const snapshot = todos;
    setTodos((prev) => prev.filter((t) => !t.completed));
    try {
      await api.clearCompleted();
    } catch (cause) {
      setTodos(snapshot);
      handleError(cause);
    }
  }, [handleError, todos]);

  return (
    <section className="flex flex-col gap-4">
      <TodoInput onAdd={addTodo} pending={pending} />

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
        >
          {error}
        </p>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white/70 shadow-sm shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 dark:shadow-none">
        <TodoFilterBar
          filter={filter}
          onFilterChange={setFilter}
          remaining={remaining}
          total={todos.length}
          hasCompleted={hasCompleted}
          onClearCompleted={clearCompleted}
        />
        <TodoList
          todos={visibleTodos}
          filter={filter}
          onToggle={toggleTodo}
          onRemove={removeTodo}
          onRename={renameTodo}
          onPriorityChange={changePriority}
        />
      </div>
    </section>
  );
}
