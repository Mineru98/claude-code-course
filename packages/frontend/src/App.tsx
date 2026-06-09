import { useEffect, useMemo, useRef, useState } from "react";
import {
  Todo,
  MAX_TITLE_LEN,
  fetchTodos,
  createTodo,
  updateTodo,
  deleteTodo,
} from "./api";
import "./styles.css";

type Filter = "all" | "active" | "completed";

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTodos()
      .then(setTodos)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (editingId !== null) editRef.current?.focus();
  }, [editingId]);

  const remaining = useMemo(
    () => todos.filter((t) => !t.completed).length,
    [todos]
  );
  const completedCount = todos.length - remaining;

  const visible = useMemo(() => {
    if (filter === "active") return todos.filter((t) => !t.completed);
    if (filter === "completed") return todos.filter((t) => t.completed);
    return todos;
  }, [todos, filter]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || submitting) return;
    setError("");
    setSubmitting(true);
    try {
      const todo = await createTodo(trimmed);
      setTodos((prev) => [...prev, todo]);
      setTitle("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(todo: Todo) {
    setError("");
    // 낙관적 업데이트 (UI-17)
    const next = { ...todo, completed: !todo.completed };
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? next : t)));
    try {
      const updated = await updateTodo(todo.id, { completed: next.completed });
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? updated : t)));
    } catch (e) {
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? todo : t))); // 롤백
      setError((e as Error).message);
    }
  }

  async function handleDelete(todo: Todo) {
    if (!window.confirm(`"${todo.title}" 할 일을 삭제할까요?`)) return;
    setError("");
    const snapshot = todos;
    setTodos((prev) => prev.filter((t) => t.id !== todo.id)); // 낙관적 삭제
    try {
      await deleteTodo(todo.id);
    } catch (e) {
      setTodos(snapshot); // 롤백
      setError((e as Error).message);
    }
  }

  function startEdit(todo: Todo) {
    setEditingId(todo.id);
    setEditText(todo.title);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  async function commitEdit(todo: Todo) {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === todo.title) {
      cancelEdit();
      return;
    }
    setError("");
    try {
      const updated = await updateTodo(todo.id, { title: trimmed });
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? updated : t)));
      cancelEdit();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function clearCompleted() {
    const done = todos.filter((t) => t.completed);
    if (done.length === 0) return;
    if (!window.confirm(`완료된 ${done.length}개 항목을 삭제할까요?`)) return;
    setError("");
    const snapshot = todos;
    setTodos((prev) => prev.filter((t) => !t.completed));
    try {
      await Promise.all(done.map((t) => deleteTodo(t.id)));
    } catch (e) {
      setTodos(snapshot);
      setError((e as Error).message);
    }
  }

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "전체" },
    { key: "active", label: "진행중" },
    { key: "completed", label: "완료" },
  ];

  return (
    <main className="app">
      <div className="card">
        <header className="header">
          <h1>
            <span aria-hidden="true">📝</span> Todo
          </h1>
          <span className="remaining" aria-live="polite">
            남은 일 {remaining}개
          </span>
        </header>

        <form className="form" onSubmit={handleAdd}>
          <div className="field">
            <label htmlFor="new-todo" className="sr-only" style={srOnly}>
              새 할 일
            </label>
            <input
              id="new-todo"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="할 일을 입력하세요"
              maxLength={MAX_TITLE_LEN}
              autoComplete="off"
            />
            {title.length > 0 && (
              <span className="counter">
                {title.length}/{MAX_TITLE_LEN}
              </span>
            )}
          </div>
          <button
            className="btn btn-primary"
            type="submit"
            disabled={!title.trim() || submitting}
          >
            {submitting ? "추가 중…" : "추가"}
          </button>
        </form>

        {error && (
          <div className="error" role="alert">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              aria-label="에러 닫기"
            >
              ×
            </button>
          </div>
        )}

        <div className="filters" role="group" aria-label="필터">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              className="filter"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading" aria-live="polite">
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
            <span style={srOnly}>불러오는 중</span>
          </div>
        ) : visible.length === 0 ? (
          <p className="empty">
            <span className="emoji" aria-hidden="true">
              🗒️
            </span>
            {filter === "completed"
              ? "완료된 할 일이 없습니다."
              : filter === "active"
              ? "진행 중인 할 일이 없습니다."
              : "할 일이 없습니다. 첫 할 일을 추가해 보세요!"}
          </p>
        ) : (
          <ul className="list">
            {visible.map((todo) => (
              <li
                key={todo.id}
                className={`item${todo.completed ? " done" : ""}`}
              >
                <input
                  type="checkbox"
                  className="check"
                  checked={todo.completed}
                  onChange={() => handleToggle(todo)}
                  aria-label={`${todo.title} 완료 표시`}
                />
                {editingId === todo.id ? (
                  <input
                    ref={editRef}
                    className="edit-input"
                    value={editText}
                    maxLength={MAX_TITLE_LEN}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={() => commitEdit(todo)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitEdit(todo);
                      if (e.key === "Escape") cancelEdit();
                    }}
                    aria-label="할 일 제목 편집"
                  />
                ) : (
                  <span
                    className="item-title"
                    onDoubleClick={() => startEdit(todo)}
                    title="더블클릭하여 편집"
                  >
                    {todo.title}
                  </span>
                )}
                <div className="actions">
                  {editingId !== todo.id && (
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => startEdit(todo)}
                      aria-label={`${todo.title} 편집`}
                    >
                      편집
                    </button>
                  )}
                  <button
                    type="button"
                    className="icon-btn danger"
                    onClick={() => handleDelete(todo)}
                    aria-label={`${todo.title} 삭제`}
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!loading && todos.length > 0 && (
          <footer className="footer">
            <span>
              전체 {todos.length}개 · 완료 {completedCount}개
            </span>
            {completedCount > 0 && (
              <button
                type="button"
                className="clear-done"
                onClick={clearCompleted}
              >
                완료 항목 삭제
              </button>
            )}
          </footer>
        )}
      </div>
    </main>
  );
}

const srOnly: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};
