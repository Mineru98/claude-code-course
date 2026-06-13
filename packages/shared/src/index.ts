/**
 * 모노레포 전역에서 공유하는 Todo 도메인 타입.
 * apps/api 와 apps/web 이 동일한 타입을 참조해 계약(contract)을 일치시킨다.
 */

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

/** Todo 생성 요청 본문 */
export interface CreateTodoInput {
  title: string;
}

/** Todo 부분 수정 요청 본문 */
export interface UpdateTodoInput {
  title?: string;
  completed?: boolean;
}

/** API 공통 응답 래퍼 */
export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
}
