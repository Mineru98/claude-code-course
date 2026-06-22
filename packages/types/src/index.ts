/**
 * 모노레포 전역에서 공유하는 할 일(Todo) 도메인 타입.
 *
 * 이 패키지는 빌드 산출물 없이 TypeScript 소스를 그대로 노출하는
 * "internal package" 패턴을 사용한다. apps/web 의 `transpilePackages`
 * 설정이 트랜스파일을 담당하므로 별도 빌드 단계가 필요 없다.
 */

/** 할 일의 우선순위. */
export type TodoPriority = "low" | "medium" | "high";

/** 목록 필터링 상태. */
export type TodoFilter = "all" | "active" | "completed";

/** 영속 저장되는 할 일 단위. */
export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  priority: TodoPriority;
  /** ISO-8601 문자열. */
  createdAt: string;
  /** ISO-8601 문자열. */
  updatedAt: string;
}

/** 할 일 생성 입력. */
export interface CreateTodoInput {
  title: string;
  priority?: TodoPriority;
}

/** 할 일 부분 수정 입력. */
export interface UpdateTodoInput {
  title?: string;
  completed?: boolean;
  priority?: TodoPriority;
}

/** 우선순위 표시에 사용하는 정렬 가중치. */
export const PRIORITY_WEIGHT: Record<TodoPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/** 유효한 우선순위 값인지 검사한다. */
export function isTodoPriority(value: unknown): value is TodoPriority {
  return value === "low" || value === "medium" || value === "high";
}
