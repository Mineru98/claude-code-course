"use client";

import { useEffect, useState } from "react";
import type { Todo } from "@todo/shared";
import { todoApi } from "@/lib/api";
import { logger } from "@/lib/logger";

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setError(null);
      setTodos(await todoApi.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const value = title.trim();
    if (!value) return;
    try {
      setError(null);
      const created = await todoApi.create({ title: value });
      setTodos((prev) => [created, ...prev]);
      setTitle("");
      logger.info("할 일 추가", { id: created.id });
    } catch (e) {
      logger.error("할 일 추가 실패", {
        message: e instanceof Error ? e.message : String(e),
      });
      setError(e instanceof Error ? e.message : "추가 실패");
    }
  }

  async function handleToggle(todo: Todo) {
    try {
      const updated = await todoApi.update(todo.id, {
        completed: !todo.completed,
      });
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      logger.info("할 일 토글", { id: updated.id, completed: updated.completed });
    } catch (e) {
      logger.error("할 일 토글 실패", {
        id: todo.id,
        message: e instanceof Error ? e.message : String(e),
      });
      setError(e instanceof Error ? e.message : "수정 실패");
    }
  }

  async function handleRemove(id: string) {
    try {
      await todoApi.remove(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
      logger.info("할 일 삭제", { id });
    } catch (e) {
      logger.error("할 일 삭제 실패", {
        id,
        message: e instanceof Error ? e.message : String(e),
      });
      setError(e instanceof Error ? e.message : "삭제 실패");
    }
  }

  const remaining = todos.filter((t) => !t.completed).length;

  return (
    <main className="container">
      <h1>📝 Todo</h1>
      <p className="subtitle">npm workspace 모노레포 · 인메모리 API</p>

      <form className="add-form" onSubmit={handleAdd}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="할 일을 입력하세요"
          aria-label="할 일 입력"
        />
        <button type="submit">추가</button>
      </form>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="empty">불러오는 중…</p>
      ) : todos.length === 0 ? (
        <p className="empty">아직 할 일이 없습니다.</p>
      ) : (
        <ul className="todo-list">
          {todos.map((todo) => (
            <li key={todo.id} className={todo.completed ? "done" : ""}>
              <label>
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => handleToggle(todo)}
                />
                <span>{todo.title}</span>
              </label>
              <button
                className="delete"
                onClick={() => handleRemove(todo.id)}
                aria-label="삭제"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && todos.length > 0 && (
        <footer className="footer">남은 할 일 {remaining}개</footer>
      )}
    </main>
  );
}
