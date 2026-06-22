"use client";

import type { Todo, TodoFilter, TodoPriority } from "@todo/types";

import { TodoItem } from "@/components/todo-item";

const EMPTY_MESSAGE: Record<TodoFilter, string> = {
  all: "아직 할 일이 없습니다. 위에서 새 할 일을 추가해 보세요.",
  active: "진행 중인 할 일이 없습니다. 모두 끝냈네요!",
  completed: "완료된 할 일이 없습니다.",
};

type TodoListProps = {
  todos: Todo[];
  filter: TodoFilter;
  onToggle: (todo: Todo) => void;
  onRemove: (todo: Todo) => void;
  onRename: (todo: Todo, title: string) => void;
  onPriorityChange: (todo: Todo, priority: TodoPriority) => void;
};

export function TodoList({
  todos,
  filter,
  onToggle,
  onRemove,
  onRename,
  onPriorityChange,
}: TodoListProps) {
  if (todos.length === 0) {
    return (
      <p className="px-4 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
        {EMPTY_MESSAGE[filter]}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onRemove={onRemove}
          onRename={onRename}
          onPriorityChange={onPriorityChange}
        />
      ))}
    </ul>
  );
}
