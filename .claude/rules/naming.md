---
paths:
  - "apps/**/*"
  - "packages/**/*"
---

# 규칙 — 네이밍 & 파일 생성

> 코드 일관성의 단일 출처(SSOT). 각 폴더의 `CLAUDE.md`에서 `@import` 된다.
> **새 파일을 만들기 전에 이 규칙을 적용한다.** 잘못된 위치·이름으로 만들면 규칙(`CLAUDE.md`)이 로드되지 않아 패턴이 어긋난다.

## 식별자 네이밍

| 종류 | 규칙 | 예 |
|---|---|---|
| 변수·함수 | `camelCase` | `todoStore`, `handleAdd`, `request` |
| 타입·인터페이스·클래스 | `PascalCase` | `Todo`, `CreateTodoInput`, `TodoStore` |
| 상수(모듈 전역 불변) | `UPPER_SNAKE` 또는 `camelCase` | `API_URL`, `PORT` |
| React 컴포넌트 | `PascalCase` | `TodoApp`, `TodoItem` |
| React 훅 | `use` 접두사 + `camelCase` | `useTodos` |
| 도메인 입력 타입 | `Create<Entity>Input` / `Update<Entity>Input` | `CreateTodoInput` |

## 파일·디렉토리 네이밍

| 위치 | 파일 종류 | 규칙 | 예 |
|---|---|---|---|
| `packages/shared/src` | 도메인 타입 모듈 | `camelCase.ts` | `todo.ts`, `user.ts` |
| `apps/api/src/routes` | 라우터 | `<resource>.routes.ts` | `todos.routes.ts` |
| `apps/api/src` | 스토어/서비스 | `<resource>.store.ts` / `<resource>.service.ts` | `todo.store.ts` |
| `apps/api/src/middleware` | 미들웨어 | `<name>.ts` | `errorHandler.ts`, `asyncHandler.ts` |
| `apps/web/src/components` | React 컴포넌트 | `PascalCase.tsx` | `TodoApp.tsx`, `TodoItem.tsx` |
| `apps/web/src/app/**` | 라우트 특수 파일 | 소문자 고정 이름 | `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx` |
| `apps/web/src/lib` | 유틸/클라이언트 | `camelCase.ts` | `api.ts` |
| `apps/web/src/hooks` | 훅 | `use*.ts` | `useTodos.ts` |

규칙:
- **리소스 이름은 복수형 라우트, 단수형 타입** — 라우트 경로 `/todos`, 도메인 타입 `Todo`.
- 한 파일에 하나의 주 책임. 컴포넌트 파일은 `default export` 1개 + 보조 요소.
- `index.ts`(barrel) 는 **재export 전용**으로만 쓴다. 로직을 index 에 넣지 않는다.
- 디렉토리는 소문자(`routes`, `middleware`, `components`, `hooks`, `lib`).

## "새 파일을 만들 때" 체크리스트

1. **그 폴더의 `CLAUDE.md` 가 이미 로드됐는지 확인** — 안 됐으면 먼저 Read 한다. (규칙은 READ 시에만 적용)
2. 위 표에서 **올바른 디렉토리와 파일명 패턴**을 고른다.
3. 도메인 타입이 필요하면 앱이 아니라 `@todo/shared` 에 먼저 추가한다. (`shared-types.md`)
4. 그 폴더의 디자인 패턴(라우터/계층, 서버·클라 경계 등)을 적용한다. (`express-api.md` / `nextjs-web.md`)
5. 만든 뒤 루트에서 `npm run typecheck`.
