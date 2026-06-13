---
paths:
  - "apps/api/**/*"
---

# 규칙 — Express API (`apps/api`)

> 코드 일관성의 단일 출처(SSOT). `apps/api/CLAUDE.md` 에서 `@import` 된다.
> 스택: Express 4 · TypeScript · ESM(NodeNext) · 인메모리 스토어.

## ESM (NodeNext) — 가장 자주 틀리는 부분

- `package.json` 에 `"type": "module"`. `tsconfig` 는 `module/moduleResolution: NodeNext`.
- **상대 import 에는 `.js` 확장자를 붙인다** (소스는 `.ts` 라도). 안 붙이면 런타임에 모듈을 못 찾는다.
  - ✅ `import { todoStore } from "./store.js";`
  - ❌ `import { todoStore } from "./store";`
- 패키지 import 는 확장자 없음: `import express from "express";`
- 타입 전용은 `import type`: `import type { CreateTodoInput } from "@todo/shared";`

## 응답 봉투 & HTTP 상태코드 (계약)

성공 `{ data }`, 실패 `{ error }` — `monorepo.md` 의 봉투 규약을 그대로 따른다.

| 상황 | 코드 | 응답 |
|---|---|---|
| 조회·수정 성공 | `200` | `res.json({ data })` |
| 생성 성공 | `201` | `res.status(201).json({ data })` |
| 삭제 성공(본문 없음) | `204` | `res.status(204).end()` |
| 입력 검증 실패 | `400` | `res.status(400).json({ error })` |
| 리소스 없음 | `404` | `res.status(404).json({ error })` |
| 서버 오류 | `500` | `res.status(500).json({ error })` |

- `error` 문자열은 **한국어 사용자 메시지**로 작성한다 (예: `"title 은 필수입니다."`).

## 라우트 핸들러 작성 패턴

핸들러는 **HTTP 경계만** 담당한다 — 입력 파싱·검증·상태코드. 데이터 조작은 store/service 로 위임.

```ts
// 입력은 shared 의 Input 타입으로 받고, 신뢰하지 말고 검증한다
app.post("/todos", (req, res) => {
  const body = req.body as Partial<CreateTodoInput>;
  const title = body.title?.trim();
  if (!title) {
    return res.status(400).json({ error: "title 은 필수입니다." });
  }
  const todo = todoStore.create({ title });   // 로직은 store 로 위임
  res.status(201).json({ data: todo });
});
```

- 입력 타입은 `@todo/shared` 의 `Create<E>Input` / `Update<E>Input` 을 쓰되, 클라이언트 입력은 `Partial<...>` 로 받아 **반드시 검증**한다.
- 검증 실패는 즉시 `return res.status(400)...` 로 조기 반환.

## 계층 분리 — 라우트 ↔ 스토어/서비스

- **비즈니스 로직과 상태는 store/service 에** 둔다. 라우트에서 직접 배열을 조작하지 않는다.
- 스토어 패턴: **클래스 정의 + 단일 인스턴스 export** (현재 `todoStore`).
  ```ts
  class TodoStore { /* list/create/update/remove */ }
  export const todoStore = new TodoStore();
  ```
- 새 리소스도 동일 패턴: `class XStore { ... }` → `export const xStore = new XStore();` (파일명 `x.store.ts`).
- 메서드는 도메인 동사로(`list`, `create`, `update`, `remove`). 없는 항목은 `null`/`false` 로 신호하고 라우트가 404 로 변환.

## 라우터 모듈화 (성장 경로 — 트리거 기반)

- **현재(단일 리소스)**: 모든 라우트를 `src/index.ts` 인라인으로 두는 것을 허용.
- **트리거: 두 번째 리소스를 추가하는 순간** → `express.Router()` 로 분리한다.
  ```ts
  // src/routes/todos.routes.ts
  import { Router } from "express";
  export const todosRouter = Router();
  todosRouter.get("/", ...);
  // src/index.ts
  app.use("/todos", todosRouter);
  ```
- 라우터 파일명은 `<resource>.routes.ts` (`naming.md`).

## 에러 처리 (성장 경로 — 트리거 기반)

- **현재**: 핸들러 안에서 직접 상태코드+`{ error }` 응답 (단순·명시적).
- **트리거: async 핸들러를 도입하거나 에러 분기가 반복되면** → 중앙 에러 처리로 전환:
  - `src/middleware/errorHandler.ts` 에 4-인자 미들웨어 `(err, req, res, next)` 를 **맨 마지막에** 등록.
  - 운영 오류는 `AppError extends Error { statusCode; isOperational }` 로 던지고, 미들웨어가 `{ error }` 로 변환.
  - **Express 4 는 async 핸들러의 throw 를 자동으로 잡지 못한다.** async 를 쓰면 반드시 `asyncHandler` 래퍼로 감싸거나 `try/catch` 후 `next(err)`.
    ```ts
    const asyncHandler = (fn) => (req, res, next) =>
      Promise.resolve(fn(req, res, next)).catch(next);
    ```
  - 정의되지 않은 경로용 404 핸들러를 에러 미들웨어 직전에 둔다.

## 미들웨어 & 부트스트랩

- 전역 미들웨어 등록 순서: `cors()` → `express.json()` → 라우트 → 404 → 에러 핸들러.
- 환경변수는 기본값과 함께: `const PORT = Number(process.env.PORT ?? 4000);`
- `/health` 같은 인프라 엔드포인트는 봉투 없이 단순 응답해도 된다 (`{ status: "ok" }`).

## 검증

- 변경 후 루트에서 `npm run typecheck`. shared 타입을 건드렸다면 web 까지 함께 검사된다.
